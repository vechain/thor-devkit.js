import {
    entropyToMnemonic,
    fromMnemonic,
    isValidMnemonic
} from '@vechain/ethers/utils/hdnode'
import { randomBytes } from 'crypto'

export namespace mnemonic {
    // see https://github.com/satoshilabs/slips/blob/master/slip-0044.md
    const VET_DERIVATION_PATH = `m/44'/818'/0'/0`

    /** generate BIP39 mnemonic words */
    export function generate() {
        return entropyToMnemonic(randomBytes(128 / 8)).split(' ')
    }

    /**
     * check if the given mnemonic words have valid checksum
     * @param words mnemonic words
     */
    export function validate(words: string[]) {
        return isValidMnemonic(words.join(' '))
    }

    /**
     * derive private key from mnemonic words according to BIP32.
     * the derivation path is defined at https://github.com/satoshilabs/slips/blob/master/slip-0044.md
     */
    export function derivePrivateKey(words: string[]): Buffer {
        const node = fromMnemonic(words.join(' '))
        return Buffer.from(node.derivePath(VET_DERIVATION_PATH + '/0').privateKey.slice(2), 'hex')
    }
}
