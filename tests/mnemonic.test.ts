import { expect } from 'chai'
import { mnemonic } from '../src'

describe('mnemonic', () => {
    it('generate', () => {
        expect(mnemonic.generate().length).equal(12)
    })
    it('validate', () => {
        expect(mnemonic.validate(['hello', 'world'])).equal(false)
        expect(mnemonic.validate(mnemonic.generate())).equal(true)
    })
    it('derive', () => {
        let words = 'ignore empty bird silly journey junior ripple have guard waste between tenant'.split(' ')
        expect(mnemonic.derivePrivateKey(words).toString('hex')).equal('27196338e7d0b5e7bf1be1c0327c53a244a18ef0b102976980e341500f492425')
    })
})
