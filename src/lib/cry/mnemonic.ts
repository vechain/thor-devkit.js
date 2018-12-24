import { randomBytes } from 'crypto'

const BIP39 = require('bip39')
const HDKey = require('hdkey')

export namespace mnemonic {
    // see https://github.com/satoshilabs/slips/blob/master/slip-0044.md
    const VET_DERIVATION_PATH = `m/44'/818'/0'/0`

    /** generate BIP39 mnemonic words */
    export function generate() {
        return BIP39.generateMnemonic(128, randomBytes).split(' ')
    }

    /**
     * check if the given mnemonic words have valid checksum
     * @param words mnemonic words
     */
    export function validate(words: string[]) {
        return BIP39.validateMnemonic(words.join(' '))
    }

    /**
     * derive private key from mnemonic words according to BIP32.
     * the derivation path is defined at https://github.com/satoshilabs/slips/blob/master/slip-0044.md
     */
    export function derivePrivateKey(words: string[]) {
        const seed = BIP39.mnemonicToSeed(words.join(' '))
        const hdKey = HDKey.fromMasterSeed(seed)
        return hdKey.derive(VET_DERIVATION_PATH + '/0').privateKey
    }
}
