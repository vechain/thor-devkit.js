import { expect } from "chai"
import { OldMnemonic, mnemonic } from "../../src"

describe('mnemonic regression check', () => {

    it('generate', () => {
        // Old Mnemonic
        expect(OldMnemonic.mnemonic.generate().length).equal(12)

        // New Mnemonic
        expect(mnemonic.generate().length).equal(12)
    })

    it('validate', () => {
        // Old Mnemonic
        expect(OldMnemonic.mnemonic.validate(['hello', 'world'])).equal(false)
        expect(OldMnemonic.mnemonic.validate(OldMnemonic.mnemonic.generate())).equal(true)

        // New Mnemonic
        expect(mnemonic.validate(['hello', 'world'])).equal(false)
        expect(mnemonic.validate(mnemonic.generate())).equal(true)
    })
})