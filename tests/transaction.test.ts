import { expect } from 'chai'
import { Transaction, blake2b256, secp256k1, address } from '../src'

// tslint:disable:quotemark
// tslint:disable:object-literal-key-quotes
// tslint:disable:max-line-length
// tslint:disable:trailing-comma

describe("transaction", () => {
    // Correct transaction body
    const correctTransactionBody: Transaction.LegacyBody = {
        type: Transaction.Type.Legacy,
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

    // Correct unsigned transaction
    const unsigned = new Transaction(correctTransactionBody)
    const unsignedEncoded = Buffer.from('f8540184aabbccdd20f840df947567d83b7b8d80addcb281a71d54fc7b3364ffed82271086000000606060df947567d83b7b8d80addcb281a71d54fc7b3364ffed824e208600000060606081808252088083bc614ec0', 'hex')

    // Delegated transaction
    const delegated = new Transaction({
        ...correctTransactionBody,
        reserved: {
            features: 1
        }
    })

    // Incorrectly delegated transaction
    const incorrectlyDelegated = new Transaction({
        ...correctTransactionBody,
        // Invalid features field
        reserved: {
            features: 1,
            unused: [Buffer.alloc(0), Buffer.alloc(0)]
        }
    })

    it('unsigned', () => {
        const signingHash = blake2b256(unsigned.encode())
        expect(signingHash.toString('hex')).equal('2a1c25ce0d66f45276a5f308b99bf410e2fc7d5b6ea37a49f2ab9f1da9446478')
        expect(unsigned.signingHash().toString('hex')).equal('2a1c25ce0d66f45276a5f308b99bf410e2fc7d5b6ea37a49f2ab9f1da9446478')

        expect(unsigned.id).equal(null)
        expect(unsigned.intrinsicGas).equal(37432)
        expect(new Transaction({ ...correctTransactionBody, clauses: [] }).intrinsicGas).equal(21000)
        expect(new Transaction({
            ...correctTransactionBody,
            clauses: [{
                to: null,
                value: 0,
                data: '0x'
            }]
        }).intrinsicGas).equal(53000)

        expect(unsigned.signature).equal(undefined)
        expect(unsigned.origin).equal(null)

        expect(unsigned.encode().toString('hex')).equal(unsignedEncoded.toString('hex'))
        expect(Transaction.decode(unsignedEncoded, true))
            .deep.equal(unsigned)
    })

    it('invalid body', () => {
        expect(() => { new Transaction({ ...correctTransactionBody, chainTag: 256 }).encode() }).to.throw()
        expect(() => { new Transaction({ ...correctTransactionBody, chainTag: -1 }).encode() }).to.throw()
        expect(() => { new Transaction({ ...correctTransactionBody, chainTag: 1.1 }).encode() }).to.throw()

        expect(() => { new Transaction({ ...correctTransactionBody, blockRef: '0x' }).encode() }).to.throw()
        expect(() => { new Transaction({ ...correctTransactionBody, blockRef: '0x' + '0'.repeat(18) }).encode() }).to.throw()

        expect(() => { new Transaction({ ...correctTransactionBody, expiration: 2 ** 32 }).encode() }).to.throw()
        expect(() => { new Transaction({ ...correctTransactionBody, expiration: -1 }).encode() }).to.throw()
        expect(() => { new Transaction({ ...correctTransactionBody, expiration: 1.1 }).encode() }).to.throw()

        expect(() => { new Transaction({ ...correctTransactionBody, gasPriceCoef: 256 }).encode() }).to.throw()
        expect(() => { new Transaction({ ...correctTransactionBody, gasPriceCoef: -1 }).encode() }).to.throw()
        expect(() => { new Transaction({ ...correctTransactionBody, gasPriceCoef: 1.1 }).encode() }).to.throw()

        expect(() => { new Transaction({ ...correctTransactionBody, gas: '0x10000000000000000' }).encode() }).to.throw()
        expect(() => { new Transaction({ ...correctTransactionBody, nonce: '0x10000000000000000' }).encode() }).to.throw()
    })

    const signed = new Transaction(correctTransactionBody)
    const signedEncoded = Buffer.from('f8970184aabbccdd20f840df947567d83b7b8d80addcb281a71d54fc7b3364ffed82271086000000606060df947567d83b7b8d80addcb281a71d54fc7b3364ffed824e208600000060606081808252088083bc614ec0b841f76f3c91a834165872aa9464fc55b03a13f46ea8d3b858e528fcceaf371ad6884193c3f313ff8effbb57fe4d1adc13dceb933bedbf9dbb528d2936203d5511df00', 'hex')
    const privKey = Buffer.from('7582be841ca040aa940fff6c05773129e135623e41acce3e0b8ba520dc1ae26a', 'hex')
    signed.signature = secp256k1.sign(blake2b256(signed.encode()), privKey)
    const signer = address.fromPublicKey(secp256k1.derivePublicKey(privKey))

    it("signed", () => {
        expect(signed.signature!.toString('hex')).equal('f76f3c91a834165872aa9464fc55b03a13f46ea8d3b858e528fcceaf371ad6884193c3f313ff8effbb57fe4d1adc13dceb933bedbf9dbb528d2936203d5511df00')
        expect(signed.origin).equal(signer)
        expect(signed.id).equal('0xda90eaea52980bc4bb8d40cb2ff84d78433b3b4a6e7d50b75736c5e3e77b71ec')
        expect(signed.signingHash(signer).toString('hex')).equal('da90eaea52980bc4bb8d40cb2ff84d78433b3b4a6e7d50b75736c5e3e77b71ec')
    })

    it("encode decode", () => {
        expect(signed.encode().toString('hex')).equal(signedEncoded.toString('hex'))
        expect(Transaction.decode(signedEncoded)).deep.equal(signed)

        expect(() => Transaction.decode(unsignedEncoded)).to.throw()
        expect(() => Transaction.decode(signedEncoded, true)).to.throw()

        // Encode invalid reserved field
        const encodedIncorrectlyDelegated = incorrectlyDelegated.encode().toString('hex')
        Transaction.decode(Buffer.from(encodedIncorrectlyDelegated, "hex"), true)
    })

    const incorrectlySigned = new Transaction(correctTransactionBody)
    incorrectlySigned.signature = Buffer.from([1, 2, 3])
    it('incorrectly signed', () => {
        expect(incorrectlySigned.origin).equal(null)
        expect(incorrectlySigned.id).equal(null)
        expect(incorrectlySigned.delegator).equal(null)
    })

    it('features', () => {
        expect(unsigned.delegated).equal(false)
        expect(delegated.delegated).equal(true)

        const priv1 = secp256k1.generatePrivateKey()
        const priv2 = secp256k1.generatePrivateKey()
        const addr1 = address.fromPublicKey(secp256k1.derivePublicKey(priv1))
        const addr2 = address.fromPublicKey(secp256k1.derivePublicKey(priv2))

        const hash = delegated.signingHash()
        const dhash = delegated.signingHash(addr1)
        expect(() => delegated.signingHash("INVALID_ADDRESS")).to.throw(Error, 'delegateFor expected address')

        const sig = Buffer.concat([
            secp256k1.sign(hash, priv1),
            secp256k1.sign(dhash, priv2)
        ])

        delegated.signature = sig

        expect(delegated.origin).equal(addr1)
        expect(delegated.delegator).equal(addr2)
    })

    it('invalid type', () => {
        const tx = new Transaction({
            ...correctTransactionBody,
            type: 1 as any
        })
        expect(()=> tx.signingHash()).to.throw("unsupported transaction type: 1")
    })

    it('decode invalid tx', () => {
        expect(() => Transaction.decode(Buffer.from([]))).to.throw("typed transaction too short")
        expect(() => Transaction.decode(Buffer.from([0x00]))).to.throw("transaction type not supported: 0")
        expect(() => Transaction.decode(Buffer.from([0x01]))).to.throw("transaction type not supported: 1")
    })
 
    it('legacy without type', () => { 
        const tx = new Transaction({
            chainTag: 1,
            blockRef: '0x00000000aabbccdd',
            expiration: 32,
            clauses: [],
            gasPriceCoef: 128,
            gas: 21000,
            dependsOn: null,
            nonce: 12345678,
        })

        expect(tx.type).equal(Transaction.Type.Legacy)
        const decoded = Transaction.decode(tx.encode(), true)
        expect(decoded.type).equal(Transaction.Type.Legacy)
        expect(decoded.body.type).equal(Transaction.Type.Legacy)
    })

    it('dynamic fee tx', () => { 
        const dynamicFeeBody: Transaction.DynamicFeeBody = {
            type: Transaction.Type.DynamicFee,
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
            maxFeePerGas: 10000000000001,
            maxPriorityFeePerGas: 10000000000000,
            gas: 21000,
            dependsOn: null,
            nonce: 12345678,
        }

        const trx = new Transaction(dynamicFeeBody)
        const encoded = trx.encode()
        expect(encoded.toString('hex')).equal('51f8600184aabbccdd20f840df947567d83b7b8d80addcb281a71d54fc7b3364ffed82271086000000606060df947567d83b7b8d80addcb281a71d54fc7b3364ffed824e20860000006060608609184e72a0008609184e72a0018252088083bc614ec0')

        const h = trx.signingHash()
        expect(h.toString('hex')).equal('4f684b4964abf813b517fd0c10ead43147484f249cf189d1730e9d3ce45d9e3a')
        expect(Transaction.decode(encoded, true)).deep.equal(trx)
        

        const priv = Buffer.from('7582be841ca040aa940fff6c05773129e135623e41acce3e0b8ba520dc1ae26a', 'hex')
        const sig = secp256k1.sign(h, priv)
        trx.signature = sig
        expect(trx.origin).equal(address.fromPublicKey(secp256k1.derivePublicKey(priv)))


        const signed = trx.encode()
        expect(signed.toString('hex')).equal('51f8a30184aabbccdd20f840df947567d83b7b8d80addcb281a71d54fc7b3364ffed82271086000000606060df947567d83b7b8d80addcb281a71d54fc7b3364ffed824e20860000006060608609184e72a0008609184e72a0018252088083bc614ec0b8414b71430905849f7e4a099c073d0fc7d600705df90650d9f29c8128513412540b2002ef9d6c0742cff5710ea8bdf8f908966d55fd3c7f328f923467f2c750d16100')

        expect(Transaction.decode(signed)).deep.equal(trx)
    })
})
