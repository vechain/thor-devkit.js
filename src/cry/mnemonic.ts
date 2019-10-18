import { Base58 } from '@vechain/ethers/utils/basex'
import * as HD from '@vechain/ethers/utils/hdnode'
import { createHash } from 'crypto'
import { randomBytes } from 'crypto'
import { ec as EC } from 'elliptic'

export namespace mnemonic {
    // see https://github.com/satoshilabs/slips/blob/master/slip-0044.md
    const VET_DERIVATION_PATH = `m/44'/818'/0'/0`
    const xpubPrefix = Buffer.from('0488b21e000000000000000000', 'hex')
    const xprivPrefix = Buffer.from('0488ade4000000000000000000', 'hex')
    const curve = new EC('secp256k1')

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

    /** hierarchical deterministic node */
    export interface HDNode {
        readonly publicKey: Buffer
        readonly privateKey: Buffer | null
        readonly chainCode: Buffer
        derive(index: number): HDNode
    }

    export namespace HDNode {
        /** create node from mnemonic words */
        export function fromMnemonic(words: string[]) {
            const node = HD.fromMnemonic(words.join(' ')).derivePath(VET_DERIVATION_PATH)
            return createHDNode(node)
        }

        /**
         * create node from xpub
         * @param pub public key
         * @param chainCode chain code
         */
        export function fromPublicKey(pub: Buffer, chainCode: Buffer) {
            const compressed = curve.keyFromPublic(pub).getPublic(true, 'array')
            const key = Buffer.concat([xpubPrefix, chainCode, Buffer.from(compressed)])
            const checksum = sha256(sha256(key)).slice(0, 4)

            const node = HD.fromExtendedKey(Base58.encode(Buffer.concat([key, checksum])))
            return createHDNode(node)
        }

        /**
         * create node from xpriv
         * @param priv private key
         * @param chainCode chain code
         */
        export function fromPrivateKey(priv: Buffer, chainCode: Buffer) {
            const key = Buffer.concat([xprivPrefix, chainCode, Buffer.from([0]), priv])
            const checksum = sha256(sha256(key)).slice(0, 4)

            const node = HD.fromExtendedKey(Base58.encode(Buffer.concat([key, checksum])))
            return createHDNode(node)
        }

    }

    function createHDNode(ethersNode: HD.HDNode): HDNode {
        const pub = Buffer.from(curve.keyFromPublic(ethersNode.publicKey.slice(2), 'hex').getPublic(false, 'array'))
        const priv = ethersNode.privateKey ? Buffer.from(ethersNode.privateKey.slice(2), 'hex') : null
        const cc = Buffer.from(ethersNode.chainCode.slice(2), 'hex')

        return {
            get publicKey() {
                return pub
            },
            get privateKey() {
                return priv
            },
            get chainCode() {
                return cc
            },
            derive(index) {
                return createHDNode(ethersNode.derivePath('' + index))
            }
        }
    }

    function sha256(data: Buffer) {
        return createHash('sha256').update(data).digest()
    }
}
