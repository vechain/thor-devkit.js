import { ethers } from 'ethers'
import { randomBytes } from 'crypto'
import { HDNode } from './hdnode'

export namespace mnemonic {
    /**
     * generate BIP39 mnemonic words
     * @param rng the optional random number generator, which generates 16~32 (step 4) random bytes.
     * Every 4 bytes produce 3 words.
     */
    export function generate(rng?: () => Buffer) {
        rng = rng ?? (() => randomBytes(128 / 8))
        return ethers.Mnemonic.fromEntropy(new Uint8Array(rng())).phrase.split(' ')
    }

    /**
     * check if the given mnemonic words have valid checksum
     * @param words mnemonic words
     */
    export function validate(words: string[]) {
        return ethers.Mnemonic.isValidMnemonic(words.join(' '))
    }

    /**
     * derive private key at index 0 from mnemonic words according to BIP32.
     * the derivation path is defined at https://github.com/satoshilabs/slips/blob/master/slip-0044.md
     */
    export function derivePrivateKey(words: string[]): Buffer {
        return HDNode.fromMnemonic(words).derive(0).privateKey!
    }
}
