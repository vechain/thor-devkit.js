import * as HD from '@vechain/ethers/utils/hdnode'
import { randomBytes } from 'crypto'
import { HDNode } from './hdnode'

export namespace mnemonic {
    /** generate BIP39 mnemonic words */
    export function generate() {
        return HD.entropyToMnemonic(randomBytes(128 / 8)).split(' ')
    }

    /**
     * check if the given mnemonic words have valid checksum
     * @param words mnemonic words
     */
    export function validate(words: string[]) {
        return HD.isValidMnemonic(words.join(' '))
    }

    /**
     * derive private key at index 0 from mnemonic words according to BIP32.
     * the derivation path is defined at https://github.com/satoshilabs/slips/blob/master/slip-0044.md
     */
    export function derivePrivateKey(words: string[]): Buffer {
        return HDNode.fromMnemonic(words).derive(0).privateKey!
    }
}
