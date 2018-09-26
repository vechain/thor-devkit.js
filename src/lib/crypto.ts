import { randomBytes } from 'crypto'
const keccak = require('keccak')
const blake = require('blakejs')

/**
 * computes blake2b 256bit hash of given data
 * @param data one or more Buffer | string
 */
export function blake2b256(...data: Array<Buffer | string>) {
    const ctx = blake.blake2bInit(32, null)
    data.forEach(d => {
        if (Buffer.isBuffer(d)) {
            blake.blake2bUpdate(ctx, d)
        } else {
            blake.blake2bUpdate(ctx, Buffer.from(d, 'utf8'))
        }
    })
    return Buffer.from(blake.blake2bFinal(ctx))
}

/**
 * computes keccak256 hash of given data
 * @param data one or more Buffer | string
 */
export function keccak256(...data: Array<Buffer | string>) {
    const h = keccak('keccak256')
    data.forEach(d => {
        if (Buffer.isBuffer(d)) {
            h.update(d)
        } else {
            h.update(Buffer.from(d, 'utf8'))
        }
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

/**
 * to check if a value presents an address
 * @param v the value to be checked
 */
export function isAddress(v: any): v is string {
    return typeof v === 'string' && /^0x[0-9a-f]{40}$/i.test(v)
}

/**
 * encode the address to checksum address that is compatible with eip-55
 * @param address input address
 */
export function toChecksumAddress(address: string) {
    if (!isAddress(address)) {
        throw new Error('invalid address')
    }
    address = address.slice(2).toLowerCase()
    const hash = keccak256(address)

    let checksumAddress = '0x'
    for (let i = 0; i < address.length; i++) {
        // tslint:disable-next-line:no-bitwise
        let byte = hash[i >> 1]
        if (i % 2 === 0) {
            // tslint:disable-next-line:no-bitwise
            byte >>= 4
        }

        if (byte % 16 >= 8) {
            checksumAddress += address[i].toUpperCase()
        } else {
            checksumAddress += address[i]
        }
    }
    return checksumAddress
}

const secp256k1Funs = require('secp256k1')

/** secp256k1 methods set */
export namespace secp256k1 {
    /** generate private key  */
    export function generatePrivateKey() {
        for (; ;) {
            const privKey = randomBytes(32)
            if (secp256k1Funs.privateKeyVerify(privKey)) {
                return privKey
            }
        }
    }

    /**
     * derive public key(uncompressed) from private key
     * @param privKey the private key
     */
    export function derivePublicKey(privKey: Buffer) {
        return secp256k1Funs.publicKeyCreate(privKey, false /* uncompressed */) as Buffer
    }

    /**
     * sign a message using elliptic curve algorithm on the curve secp256k1
     * @param msgHash hash of message
     * @param privKey serialized private key
     */
    export function sign(msgHash: Buffer, privKey: Buffer) {
        const sig = secp256k1Funs.sign(msgHash, privKey)
        const packed = Buffer.alloc(65)
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
        if (sig.length !== 65) {
            throw new Error('invalid signature')
        }
        const recovery = sig[64]
        if (recovery !== 0 && recovery !== 1) {
            throw new Error('invalid signature recovery')
        }

        return secp256k1Funs.recover(msgHash, sig.slice(0, 64), recovery, false) as Buffer
    }
}

const Keythereum = require('keythereum')

/** to present encrypted private key in Ethereum keystore format. */
export interface Keystore {
    address: string
    crypto: object
    id: string
    version: number
}

export namespace Keystore {
    /**
     * encrypt private key to keystore with given password
     * @param privateKey the private key to be encrypted
     * @param password password to encrypt the private key
     */
    export function encrypt(privateKey: Buffer, password: string) {
        return new Promise<Keystore>((resolve, reject) => {
            if (!secp256k1Funs.privateKeyVerify(privateKey)) {
                return reject(new Error('invalid private key'))
            }
            Keythereum.dump(password, privateKey, randomBytes(32), randomBytes(16), {
                cipher: 'aes-128-ctr',
                kdf: 'scrypt',
                kdfparams: {
                    dklen: 32,
                    memory: 280000000,
                    n: 262144,
                    p: 1,
                    r: 8,
                },
            }, resolve)
        })
    }

    /**
     * decrypt private key from keystore
     * an error thrown if not well formed
     * @param ks the keystore
     * @param password password to decrypt keystore
     */
    export function decrypt(ks: Keystore, password: string) {
        return new Promise<Buffer>((resolve, reject) => {
            Keythereum.recover(password, validate(normalize(ks)), (r: Buffer | Error) => {
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
    export function wellFormed(ks: any): ks is Keystore {
        try {
            validate(normalize(ks))
            return true
        } catch {
            return false
        }
    }

    /** normalize keystore. e.g. lower case keys */
    function normalize(obj: object) {
        const lowerKey = (o: object) => {
            return Object.keys(o).reduce((converted, k) => {
                let v = (o as any)[k]
                if (typeof v === 'object') {
                    v = lowerKey(v)
                }
                converted[k.toLowerCase()] = v
                return converted
            }, {} as any)
        }
        return lowerKey(obj)
    }

    function validate(ks: Keystore) {
        if (ks.version !== 1 && ks.version !== 3) {
            throw new Error('unsupported version')
        }
        if (!/^[0-9a-f]{40}$/i.test(ks.address)) {
            throw new Error('invalid address')
        }
        if (!/^[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/i.test(ks.id)) {
            throw new Error('invalid id')
        }
        if (typeof ks.crypto !== 'object') {
            throw new Error('invalid crypto')
        }
        return ks
    }
}

import BIP39 = require('bip39')
import HDKey = require('hdkey')

export namespace mnemonic {
    // see https://github.com/satoshilabs/slips/blob/master/slip-0044.md
    const VET_DERIVATION_PATH = `m/44'/818'/0'/0`

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
        const seed = BIP39.mnemonicToSeed(words.join(' '))
        const hdKey = HDKey.fromMasterSeed(seed)
        return hdKey.derive(VET_DERIVATION_PATH + '/0').privateKey
    }
}
