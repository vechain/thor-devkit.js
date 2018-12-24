import { expect } from 'chai'
import { Certificate, cry } from '../src'
import { secp256k1 } from '../src/lib/cry'

describe('cert', () => {
    const privKey = Buffer.from('7582be841ca040aa940fff6c05773129e135623e41acce3e0b8ba520dc1ae26a', 'hex')
    const signer = '0x' + cry.publicKeyToAddress(cry.secp256k1.derivePublicKey(privKey)).toString('hex')
    const cert = {
        purpose: 'identification',
        payload: {
            type: 'text',
            content: 'fyi'
        },
        domain: 'localhost',
        timestamp: 1545035330,
        signer
    }
    const cert2 = {
        domain: 'localhost',
        timestamp: 1545035330,
        purpose: 'identification',
        signer,
        payload: {
            content: 'fyi',
            type: 'text'
        }
    }
    it('encode', () => {
        expect(Certificate.encode(cert)).equal(Certificate.encode(cert2))
    })

    it('verify', () => {
        const sig = '0x' + secp256k1.sign(cry.blake2b256(Certificate.encode(cert)), privKey).toString('hex')
        expect(() => Certificate.verify({ ...cert, signature: sig, signer: '0x' })).to.throw()
        expect(() => Certificate.verify({ ...cert, signature: sig })).not.to.throw()
    })
})
