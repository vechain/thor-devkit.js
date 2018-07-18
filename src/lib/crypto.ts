import { randomBytes } from 'crypto'
const keccak = require('keccak')
const blake = require('blakejs')

/**
 * computes blake2b 256bit hash of given data
 * @param data one or more Buffer | string
 */
export function blake2b256(...data: (Buffer | string)[]) {
    let ctx = blake.blake2bInit(32, null)
    data.forEach(d => {
        if (Buffer.isBuffer(d))
            blake.blake2bUpdate(ctx, d)
        else
            blake.blake2bUpdate(ctx, Buffer.from(d, 'utf8'))
    })
    return Buffer.from(blake.blake2bFinal(ctx))
}

/**
 * computes keccak256 hash of given data
 * @param data one or more Buffer | string
 */
export function keccak256(...data: (Buffer | string)[]) {
    let h = keccak('keccak256')
    data.forEach(d => {
        if (Buffer.isBuffer(d))
            h.update(d)
        else
            h.update(Buffer.from(d, 'utf8'))
    })
    return h.digest() as Buffer
}


/**
 * derive Address from public key
 * @param pubKey the public key
 */
export function publicKeyToAddress(pubKey: Buffer) {
    return keccak256(pubKey.slice(1)).slice(12)
}

/** secp256k1 methods set */
export namespace secp256k1 {
    const secp256k1 = require('secp256k1')
    /** generate private key  */
    export function generatePrivateKey() {
        for (; ;) {
            let privKey = randomBytes(32)
            if (secp256k1.privateKeyVerify(privKey)) {
                return privKey
            }
        }
    }

    /**
     * derive public key(uncompressed) from private key
     * @param privKey the private key
     */
    export function derivePublicKey(privKey: Buffer) {
        return secp256k1.publicKeyCreate(privKey, false /* uncompressed */) as Buffer
    }

    /**
     * sign a message using elliptic curve algorithm on the curve secp256k1
     * @param msgHash hash of message
     * @param privKey serialized private key
     */
    export function sign(msgHash: Buffer, privKey: Buffer) {
        let sig = secp256k1.sign(msgHash, privKey)
        let packed = Buffer.alloc(65)
        sig.signature.copy(packed)
        packed[64] = sig.recovery
        return packed
    }

    /**
     * recovery signature to public key
     * @param msgHash hash of message
     * @param sig signature
     */
    export function recover(msgHash: Buffer, sig: Buffer) {
        if (sig.length != 65)
            throw new Error('invalid signature')
        let recovery = sig[64]
        if (recovery !== 0 && recovery !== 1)
            throw new Error('invalid signature recovery')

        return secp256k1.recover(msgHash, sig.slice(0, 64), recovery, false) as Buffer
    }
}


const Keythereum = require('keythereum')

/** to present encrypted private key in Ethereum keystore format. */
export type Keystore = {
    address: string
    crypto: object
    id: string
    version: number
}

export namespace Keystore {
    /**
     * encrypt private key to keystore with given password
     * @param privateKey the private key to be encrypted
     * @param password 
     */
    export function encrypt(privateKey: Buffer, password: string) {
        return new Promise<Keystore>(resolve => {
            Keythereum.dump(password, privateKey, randomBytes(32), randomBytes(16), {
                kdf: "scrypt",
                cipher: "aes-128-ctr",
                kdfparams: {
                    memory: 280000000,
                    dklen: 32,
                    n: 262144,
                    r: 8,
                    p: 1
                }
            }, resolve)
        })
    }

    /**
     * decrypt private key from keystore
     * @param ks the keystore
     * @param password 
     */
    export function decrypt(ks: Keystore, password: string) {
        return new Promise<Buffer>((resolve, reject) => {
            Keythereum.recover(password, ks, (r: Buffer | Error) => {
                if (!Buffer.isBuffer(r)) {
                    return reject(r)
                }
                resolve(r)
            })
        })
    }

    /**
     * roughly check whether keystore is well formed
     * @param ks the keystore
     */
    export function wellFormed(ks: Keystore) {
        if (ks.version !== 1 && ks.version !== 3)
            return false
        if (!/^[0-9a-f]{40}$/i.test(ks.address))
            return false
        if (!/^[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/.test(ks.id))
            return false
        if (typeof ks.crypto !== 'object')
            return false
        return true
    }
}

import BIP39 = require('bip39')
import HDKey = require('hdkey')

export namespace mnemonic {
    // see https://github.com/satoshilabs/slips/blob/master/slip-0044.md
    const VET_DERIVATION_PATH = `m/44'/818'/0'/0/0`

    /** generate BIP39 mnemonic words */
    export function generate() {
        return BIP39.generateMnemonic(128, randomBytes).split(' ')
    }

    /**
     * check if the given mnemonic words have valid checksum
     * @param words mnemonic words
     */
    export function validate(words: string[]) {
        return BIP39.validateMnemonic(words.join(' '))
    }

    /** 
     * derive private key from mnemonic words according to BIP32.
     * the derivation path is defined at https://github.com/satoshilabs/slips/blob/master/slip-0044.md
     */
    export function derivePrivateKey(words: string[]) {
        let seed = BIP39.mnemonicToSeed(words.join(' '))
        let hdKey = HDKey.fromMasterSeed(seed)
        return hdKey.derive(VET_DERIVATION_PATH).privateKey
    }
}
