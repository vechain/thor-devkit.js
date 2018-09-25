import { expect } from 'chai'
import { cry } from '../src'

// tslint:disable:quotemark
// tslint:disable:object-literal-key-quotes
// tslint:disable:max-line-length
// tslint:disable:trailing-comma

describe('hash', () => {
    it('blake2b256', () => {
        expect(cry.blake2b256(Buffer.alloc(0)).toString('hex')).equal('0e5751c026e543b2e8ab2eb06099daa1d1e5df47778f7787faab45cdf12fe3a8')
        expect(cry.blake2b256('hello world').toString('hex')).equal('256c83b297114d201b30179f3f0ef0cace9783622da5974326b436178aeef610')
        expect(cry.blake2b256('hello', ' world').toString('hex')).equal('256c83b297114d201b30179f3f0ef0cace9783622da5974326b436178aeef610')
    })

    it('keccak', () => {
        expect(cry.keccak256(Buffer.alloc(0)).toString('hex')).equal('c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470')
        expect(cry.keccak256('hello world').toString('hex')).equal('47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad')
        expect(cry.keccak256('hello', ' world').toString('hex')).equal('47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad')
    })
})

describe('isValidAddress', () => {
    it('validate address', () => {
        expect(cry.isValidAddress('not an address')).equal(false)
        expect(cry.isValidAddress('52908400098527886E0F7030069857D2E4169EE7')).equal(false)
        expect(cry.isValidAddress('0x52908400098527886E0F7030069857D2E4169EE7')).equal(true)
    })
})

describe('toChecksumAddress', () => {
    it('invalid input should throw error', () => {
        expect(() => { cry.toChecksumAddress('invalid data') }).to.throw('invalid address')
        expect(() => { cry.toChecksumAddress('52908400098527886E0F7030069857D2E4169EE7') }).to.throw('invalid address')
    })

    it('valid input', () => {
        expect(cry.toChecksumAddress('0x8617E340B3D01FA5F11F306F4090FD50E238070D')).equal('0x8617E340B3D01FA5F11F306F4090FD50E238070D')
        expect(cry.toChecksumAddress('0x8617E340B3D01FA5F11F306F4090FD50E238070D'.toLowerCase())).equal('0x8617E340B3D01FA5F11F306F4090FD50E238070D')
        expect(cry.toChecksumAddress('0xde709f2102306220921060314715629080e2fb77')).equal('0xde709f2102306220921060314715629080e2fb77')
        expect(cry.toChecksumAddress('0xde709f2102306220921060314715629080e2fb77'.toLowerCase())).equal('0xde709f2102306220921060314715629080e2fb77')
        expect(cry.toChecksumAddress('0x27b1fdb04752bbc536007a920d24acb045561c26')).equal('0x27b1fdb04752bbc536007a920d24acb045561c26')
        expect(cry.toChecksumAddress('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed')).equal('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed')
        expect(cry.toChecksumAddress('0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359')).equal('0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359')
        expect(cry.toChecksumAddress('0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB')).equal('0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB')
        expect(cry.toChecksumAddress('0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb')).equal('0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb')
    })
})

describe('secp256k1', () => {
    const privKey = Buffer.from('7582be841ca040aa940fff6c05773129e135623e41acce3e0b8ba520dc1ae26a', 'hex')
    const pubKey = Buffer.from('04b90e9bb2617387eba4502c730de65a33878ef384a46f1096d86f2da19043304afa67d0ad09cf2bea0c6f2d1767a9e62a7a7ecc41facf18f2fa505d92243a658f', 'hex')
    const addr = '0xd989829d88b0ed1b06edf5c50174ecfa64f14a64'
    const msgHash = cry.keccak256('hello world')
    const sig = Buffer.from('f8fe82c74f9e1f5bf443f8a7f8eb968140f554968fdcab0a6ffe904e451c8b9244be44bccb1feb34dd20d9d8943f8c131227e55861736907b02d32c06b934d7200', 'hex')

    it('derive', () => {
        expect(cry.secp256k1.derivePublicKey(privKey)).deep.equal(pubKey)
        expect('0x' + cry.publicKeyToAddress(pubKey).toString('hex')).deep.equal(addr)
    })
    it('sign/recover', () => {
        expect(cry.secp256k1.sign(msgHash, privKey)).deep.equal(sig)
        expect(cry.secp256k1.recover(msgHash, sig)).deep.equal(pubKey)
    })
})

describe('keystore', () => {
    const privKey = cry.secp256k1.generatePrivateKey()

    it('encrypt', async () => {
        const ks = await cry.Keystore.encrypt(privKey, '123')
        expect(ks.version).equal(3)
        expect(ks.address).equal(cry.publicKeyToAddress(cry.secp256k1.derivePublicKey(privKey)).toString('hex'))
    })

    it('decrypt', async () => {
        const ks = await cry.Keystore.encrypt(privKey, '123')
        const dprivKey = await cry.Keystore.decrypt(ks, '123')
        expect(dprivKey).deep.equal(privKey)

        let fail
        try {
            await cry.Keystore.decrypt(ks, 'wrong pass')
            fail = false
        } catch {
            fail = true
        }
        expect(fail).equal(true)
    })

    it('validate', async () => {
        const ks = await cry.Keystore.encrypt(privKey, '123')
        expect(cry.Keystore.wellFormed(ks)).equal(true)

        let cpy = { ...ks, version: 0 }
        expect(cry.Keystore.wellFormed(cpy)).equal(false)

        cpy = { ...ks, address: 'not an address' }
        expect(cry.Keystore.wellFormed(cpy)).equal(false)

        cpy = { ...ks, id: 'not an id' }
        expect(cry.Keystore.wellFormed(cpy)).equal(false)

        cpy = { ...ks, crypto: 'not an object' as any }
        expect(cry.Keystore.wellFormed(cpy)).equal(false)

        cpy = { ...ks };
        // tslint:disable-next-line:no-string-literal
        (cpy as any)['Crypto'] = cpy.crypto
        delete cpy.crypto
        expect(cry.Keystore.wellFormed(cpy)).equal(true)

        cpy = { ...ks };
        // tslint:disable-next-line:no-string-literal
        (cpy.crypto as any)['Cipher'] = (cpy.crypto as any)['cipher']
        // tslint:disable-next-line:no-string-literal
        delete (cpy.crypto as any)['cipher']
        expect(cry.Keystore.wellFormed(cpy)).equal(true)

        cpy = { ...ks }
        cpy.id = cpy.id.toUpperCase()
        expect(cry.Keystore.wellFormed(cpy)).equal(true)
    })
})

describe('mnemonic', () => {
    it('generate', () => {
        expect(cry.mnemonic.generate().length).equal(12)
    })
    it('validate', () => {
        expect(cry.mnemonic.validate(['hello', 'world'])).equal(false)
        expect(cry.mnemonic.validate(cry.mnemonic.generate())).equal(true)
    })
    it('derive', () => {
        const words = 'ignore empty bird silly journey junior ripple have guard waste between tenant'.split(' ')
        expect(cry.mnemonic.derivePrivateKey(words).toString('hex')).equal('27196338e7d0b5e7bf1be1c0327c53a244a18ef0b102976980e341500f492425')
    })
})
