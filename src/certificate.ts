import { publicKeyToAddress } from './cry/address'
import { blake2b256 } from './cry/blake2b'
import { secp256k1 } from './cry/secp256k1'

const fastJsonStableStringify = require('fast-json-stable-stringify')

/**
 * Client side self-signed certificate
 */
export interface Certificate {
    purpose: string
    payload: {
        type: string
        content: string
    }

    domain: string
    timestamp: number
    signer: string

    signature?: string
}

export namespace Certificate {
    function safeToLowerCase(str: string) {
        return typeof str === 'string' ? str.toLowerCase() : str
    }
    /**
     * deterministically encode cert into JSON
     * @param cert cert object
     */
    export function encode(cert: Certificate) {
        return fastJsonStableStringify({
            ...cert,
            signer: safeToLowerCase(cert.signer),
            signature: cert.signature ? safeToLowerCase(cert.signature) : cert.signature
        }) as string
    }

    /**
     * verify the cert
     * @param cert cert object with signature
     */
    export function verify(cert: Certificate) {
        if (!cert.signature) {
            throw new Error('signature missing')
        }
        const signature = cert.signature
        if (!/^0x[0-9a-f]+$/i.test(signature) || signature.length % 2 !== 0) {
            throw new Error('invalid signature')
        }

        const encoded = encode({ ...cert, signature: undefined })
        const signingHash = blake2b256(encoded)

        const pubKey = secp256k1.recover(signingHash, Buffer.from(signature.slice(2), 'hex'))

        if ('0x' + publicKeyToAddress(pubKey).toString('hex') !== safeToLowerCase(cert.signer)) {
            throw new Error('signature does not match with signer')
        }
    }
}
