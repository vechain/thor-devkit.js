import { randomBytes } from 'crypto'
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
