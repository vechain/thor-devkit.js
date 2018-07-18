import { expect } from 'chai'
import { Keystore, secp256k1, publicKeyToAddress } from '../src'

describe('keystore', () => {
    let privKey = secp256k1.generatePrivateKey()

    it('encrypt', async () => {
        let ks = await Keystore.encrypt(privKey, '123')
        expect(ks.version).equal(3)
        expect(ks.address).equal(publicKeyToAddress(secp256k1.derivePublicKey(privKey)).toString('hex'))
    })

    it('decrypt', async () => {
        let ks = await Keystore.encrypt(privKey, '123')
        let dprivKey = await Keystore.decrypt(ks, '123')
        expect(dprivKey).deep.equal(privKey)

        let fail
        try {
            await Keystore.decrypt(ks, 'wrong pass')
            fail = false
        } catch{
            fail = true
        }
        expect(fail).equal(true)
    })

    it('validate', async () => {
        let ks = await Keystore.encrypt(privKey, '123')
        expect(Keystore.wellFormed(ks)).equal(true)

        let cpy = { ...ks, version: 0 }
        expect(Keystore.wellFormed(cpy)).equal(false)

        cpy = { ...ks, address: 'not an address' }
        expect(Keystore.wellFormed(cpy)).equal(false)

        cpy = { ...ks, id: 'not an id' }
        expect(Keystore.wellFormed(cpy)).equal(false)

        cpy = { ...ks, crypto: 'not an object' as any }
        expect(Keystore.wellFormed(cpy)).equal(false)
    })

})
