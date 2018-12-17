import { blake2b256, publicKeyToAddress, secp256k1 } from './crypto'
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
    /**
     * deterministically encode cert into JSON
     * @param cert cert object
     */
    export function encode(cert: Certificate) {
        return fastJsonStableStringify(cert) as string
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

        const encoded = fastJsonStableStringify({ ...cert, signature: undefined })
        const signingHash = blake2b256(encoded)

        const pubKey = secp256k1.recover(signingHash, Buffer.from(signature.slice(2), 'hex'))

        if ('0x' + publicKeyToAddress(pubKey).toString('hex') !== cert.signer) {
            throw new Error('signature does not match with signer')
        }
    }
}
