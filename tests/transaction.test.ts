import { expect } from 'chai'
import { cry, Transaction } from '../src'

// tslint:disable:quotemark
// tslint:disable:object-literal-key-quotes
// tslint:disable:max-line-length
// tslint:disable:trailing-comma

describe("transaction", () => {
    const body: Transaction.Body = {
        chainTag: 1,
        blockRef: '0x00000000aabbccdd',
        expiration: 32,
        clauses: [{
            to: '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed',
            value: 10000,
            data: '0x000000606060'
        }, {
            to: '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed',
            value: 20000,
            data: '0x000000606060'
        }],
        gasPriceCoef: 128,
        gas: 21000,
        dependsOn: null,
        nonce: 12345678,
    }
    const unsigned = new Transaction(body)

    it('unsigned', () => {
        const signingHash = cry.blake2b256(unsigned.encode())
        expect(signingHash.toString('hex')).equal('2a1c25ce0d66f45276a5f308b99bf410e2fc7d5b6ea37a49f2ab9f1da9446478')
        expect(unsigned.id).equal(null)
        expect(unsigned.intrinsicGas).equal(37432)
        expect(new Transaction({ ...body, clauses: [] }).intrinsicGas).equal(21000)
        expect(new Transaction({
            ...body,
            clauses: [{
                to: null,
                value: 0,
                data: '0x'
            }]
        }).intrinsicGas).equal(53000)

        expect(unsigned.signature).equal(undefined)
        expect(unsigned.signer).equal(null)

        expect(unsigned.encode().toString('hex')).equal('f8540184aabbccdd20f840df947567d83b7b8d80addcb281a71d54fc7b3364ffed82271086000000606060df947567d83b7b8d80addcb281a71d54fc7b3364ffed824e208600000060606081808252088083bc614ec0')
        expect(Transaction.decode(Buffer.from('f8540184aabbccdd20f840df947567d83b7b8d80addcb281a71d54fc7b3364ffed82271086000000606060df947567d83b7b8d80addcb281a71d54fc7b3364ffed824e208600000060606081808252088083bc614ec0', 'hex')))
            .deep.equal(unsigned)
    })

    it('invalid body', () => {
        expect(() => { new Transaction({ ...body, chainTag: 256 }).encode() }).to.throw()
        expect(() => { new Transaction({ ...body, chainTag: -1 }).encode() }).to.throw()
        expect(() => { new Transaction({ ...body, chainTag: 1.1 }).encode() }).to.throw()

        expect(() => { new Transaction({ ...body, blockRef: '0x' }).encode() }).to.throw()
        expect(() => { new Transaction({ ...body, blockRef: '0x' + '0'.repeat(18) }).encode() }).to.throw()

        expect(() => { new Transaction({ ...body, expiration: 2 ** 32 }).encode() }).to.throw()
        expect(() => { new Transaction({ ...body, expiration: -1 }).encode() }).to.throw()
        expect(() => { new Transaction({ ...body, expiration: 1.1 }).encode() }).to.throw()

        expect(() => { new Transaction({ ...body, gasPriceCoef: 256 }).encode() }).to.throw()
        expect(() => { new Transaction({ ...body, gasPriceCoef: -1 }).encode() }).to.throw()
        expect(() => { new Transaction({ ...body, gasPriceCoef: 1.1 }).encode() }).to.throw()

        expect(() => { new Transaction({ ...body, gas: '0x10000000000000000' }).encode() }).to.throw()
        expect(() => { new Transaction({ ...body, nonce: '0x10000000000000000' }).encode() }).to.throw()
    })

    const signed = new Transaction(body)
    const privKey = Buffer.from('7582be841ca040aa940fff6c05773129e135623e41acce3e0b8ba520dc1ae26a', 'hex')
    signed.signature = cry.secp256k1.sign(cry.blake2b256(signed.encode()), privKey)
    const signer = cry.publicKeyToAddress(cry.secp256k1.derivePublicKey(privKey))

    it("signed", () => {
        expect(signed.signature!.toString('hex')).equal('f76f3c91a834165872aa9464fc55b03a13f46ea8d3b858e528fcceaf371ad6884193c3f313ff8effbb57fe4d1adc13dceb933bedbf9dbb528d2936203d5511df00')
        expect(signed.signer).equal('0x' + signer.toString('hex'))
        expect(signed.id).equal('0xda90eaea52980bc4bb8d40cb2ff84d78433b3b4a6e7d50b75736c5e3e77b71ec')
    })

    const encoded = 'f8970184aabbccdd20f840df947567d83b7b8d80addcb281a71d54fc7b3364ffed82271086000000606060df947567d83b7b8d80addcb281a71d54fc7b3364ffed824e208600000060606081808252088083bc614ec0b841f76f3c91a834165872aa9464fc55b03a13f46ea8d3b858e528fcceaf371ad6884193c3f313ff8effbb57fe4d1adc13dceb933bedbf9dbb528d2936203d5511df00'
    it("encode decode", () => {
        expect(signed.encode().toString('hex')).equal(encoded)
        expect(Transaction.decode(Buffer.from(encoded, 'hex'))).deep.equal(signed)
    })

    const incorrectlySigned = new Transaction(body)
    incorrectlySigned.signature = Buffer.from([1, 2, 3])
    it('incorrectly signed', () => {
        expect(incorrectlySigned.signer).equal(null)
        expect(incorrectlySigned.id).equal(null)
    })
})
