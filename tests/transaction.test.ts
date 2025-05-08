import { expect } from 'chai'
import { Transaction, blake2b256, secp256k1, address } from '../src'

// tslint:disable:quotemark
// tslint:disable:object-literal-key-quotes
// tslint:disable:max-line-length
// tslint:disable:trailing-comma

describe("transaction", () => {

    // Correct transaction body
    const correctTransactionBody: Transaction.Body = {
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

    describe('dynamic fee transaction', () => {
        // Dynamic fee transaction body
        const dynamicFeeBody: Transaction.Body = {
            chainTag: 1,
            blockRef: '0x00000000aabbccdd',
            expiration: 32,
            clauses: [{
                to: '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed',
                value: 10000,
                data: '0x000000606060'
            }],
            gas: 21000,
            dependsOn: null,
            nonce: 12345678,
            type: Transaction.TYPE_DYNAMIC_FEE,
            maxFeePerGas: '0x2540be400', // 10 Gwei
            maxPriorityFeePerGas: '0x3b9aca00' // 1 Gwei
        }

        // Create unsigned dynamic fee transaction
        const unsignedDynamicFee = new Transaction(dynamicFeeBody)

        it('creates dynamic fee transaction', () => {
            expect(unsignedDynamicFee.body.type).equal(Transaction.TYPE_DYNAMIC_FEE)
            expect(unsignedDynamicFee.body.maxFeePerGas).equal('0x2540be400')
            expect(unsignedDynamicFee.body.maxPriorityFeePerGas).equal('0x3b9aca00')
            expect(unsignedDynamicFee.body.gasPriceCoef).equal(undefined)
        })

        it('validates dynamic fee fields', () => {
            expect(() => new Transaction({
                ...dynamicFeeBody,
                maxFeePerGas: undefined
            })).to.throw('Dynamic fee transaction requires maxFeePerGas and maxPriorityFeePerGas')

            expect(() => new Transaction({
                ...dynamicFeeBody,
                maxPriorityFeePerGas: undefined
            })).to.throw('Dynamic fee transaction requires maxFeePerGas and maxPriorityFeePerGas')

            expect(() => new Transaction({
                ...dynamicFeeBody,
                type: '0x1'
            })).to.throw('Invalid transaction type')

            const body = {
                ...dynamicFeeBody,
                gasPriceCoef: 128
            }
            const tx = new Transaction({
                ...dynamicFeeBody,
                gasPriceCoef: 128
            })
            expect(tx.body.gasPriceCoef).equal(undefined)
        })

        it('encodes and decodes dynamic fee transaction', () => {
            const encoded = unsignedDynamicFee.encode()
            const decoded = Transaction.decode(encoded, true)

            expect(decoded.body.type).equal(Transaction.TYPE_DYNAMIC_FEE)
            expect(decoded.body.maxFeePerGas).equal(10000000000)
            expect(decoded.body.maxPriorityFeePerGas).equal(1000000000)
            expect(decoded.body.gasPriceCoef).equal(undefined)
        })

        it('signs and verifies dynamic fee transaction', () => {
            const privKey = Buffer.from('7582be841ca040aa940fff6c05773129e135623e41acce3e0b8ba520dc1ae26a', 'hex')
            const tx = new Transaction(dynamicFeeBody)

            const signingHash = tx.signingHash()
            tx.signature = secp256k1.sign(signingHash, privKey)

            const signer = address.fromPublicKey(secp256k1.derivePublicKey(privKey))
            expect(tx.origin).equal(signer)
            expect(tx.id).to.not.equal(null)
        })

        it('handles dynamic fee transaction with delegation', () => {
            const delegatedDynamicFee = new Transaction({
                ...dynamicFeeBody,
                reserved: {
                    features: 1
                }
            })

            const priv1 = secp256k1.generatePrivateKey()
            const priv2 = secp256k1.generatePrivateKey()
            const addr1 = address.fromPublicKey(secp256k1.derivePublicKey(priv1))
            const addr2 = address.fromPublicKey(secp256k1.derivePublicKey(priv2))

            const hash = delegatedDynamicFee.signingHash()
            const dhash = delegatedDynamicFee.signingHash(addr1)

            const sig = Buffer.concat([
                secp256k1.sign(hash, priv1),
                secp256k1.sign(dhash, priv2)
            ])

            delegatedDynamicFee.signature = sig

            expect(delegatedDynamicFee.origin).equal(addr1)
            expect(delegatedDynamicFee.delegator).equal(addr2)
            expect(delegatedDynamicFee.delegated).equal(true)
        })

        it('calculates fees correctly', () => {
            const baseFee = '0x2540be400' // 10 Gwei
            const maxPriorityFeePerGas = '0x3b9aca00' // 1 Gwei

            const maxFeePerGas = Transaction.calculateMaxFeePerGas(baseFee, maxPriorityFeePerGas)
            expect(maxFeePerGas).equal("11000000000") // 11 Gwei (10 + 1)

            const estimatedPriorityFee = Transaction.estimateMaxPriorityFeePerGas('0x3b9aca00', 1.1)
            expect(estimatedPriorityFee).equal('1100000000') // 1.1 Gwei
        })

        it('handles mixed transaction types', () => {
            // Legacy transaction
            const body = { ...dynamicFeeBody }
            delete body.maxPriorityFeePerGas
            delete body.maxFeePerGas
            const legacyTx = Transaction.createLegacyTransaction({
                ...body,
                gasPriceCoef: 128
            })
            expect(legacyTx.body.type).equal(Transaction.TYPE_LEGACY)
            expect(legacyTx.body.gasPriceCoef).equal(128)
            expect(legacyTx.body.maxFeePerGas).equal(undefined)
            expect(legacyTx.body.maxPriorityFeePerGas).equal(undefined)

            // Dynamic fee transaction
            const dynamicFeeTx = Transaction.createDynamicFeeTransaction(
                {
                    ...dynamicFeeBody
                },
                '0x2540be400',
                '0x3b9aca00'
            )
            expect(dynamicFeeTx.body.type).equal(Transaction.TYPE_DYNAMIC_FEE)
            expect(dynamicFeeTx.body.gasPriceCoef).equal(undefined)
            expect(dynamicFeeTx.body.maxFeePerGas).equal('0x2540be400')
            expect(dynamicFeeTx.body.maxPriorityFeePerGas).equal('0x3b9aca00')
        })
    })
})
