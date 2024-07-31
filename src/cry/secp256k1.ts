import { ec as EC } from 'elliptic'
import * as randomBytes from 'randombytes'

const curve = new EC('secp256k1')

const N = Buffer.from('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141')
const ZERO = Buffer.alloc(32, 0)

function isValidPrivateKey(key: Buffer) {
    return !key.equals(ZERO) && key.compare(N) < 0
}

/** secp256k1 methods set */
export namespace secp256k1 {
    /** generate private key  */
    export function generatePrivateKey() {
        for (; ;) {
            const privKey = randomBytes(32)
            if (isValidPrivateKey(privKey)) {
                return privKey
            }
        }
    }

    /**
     * derive public key(uncompressed) from private key
     * @param privKey the private key
     */
    export function derivePublicKey(privKey: Buffer) {
        const keyPair = curve.keyFromPrivate(privKey)
        return Buffer.from(keyPair.getPublic().encode('array', false) as any)
    }

    /**
     * sign a message using elliptic curve algorithm on the curve secp256k1
     * @param msgHash hash of message
     * @param privKey serialized private key
     */
    export function sign(msgHash: Buffer, privKey: Buffer) {
        const keyPair = curve.keyFromPrivate(privKey)
        const sig = keyPair.sign(msgHash, { canonical: true })

        const r = Buffer.from(sig.r.toArray('be', 32))
        const s = Buffer.from(sig.s.toArray('be', 32))

        return Buffer.concat([r, s, Buffer.from([sig.recoveryParam!])])
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

        const r = sig.slice(0, 32)
        const s = sig.slice(32, 64)

        return Buffer.from(curve.recoverPubKey(
            msgHash,
            { r, s },
            recovery
        ).encode('array', false))
    }
}
