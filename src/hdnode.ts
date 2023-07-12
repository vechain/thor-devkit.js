import { ethers } from 'ethers'
import { createHash } from 'crypto'
import { ec as EC } from 'elliptic'
import { address } from './address'
import { Buffer } from 'buffer'

// see https://github.com/satoshilabs/slips/blob/master/slip-0044.md
const VET_DERIVATION_PATH = `m/44'/818'/0'/0`
const xpubPrefix = Buffer.from('0488b21e000000000000000000', 'hex')
const xprivPrefix = Buffer.from('0488ade4000000000000000000', 'hex')
const curve = new EC('secp256k1')

/** BIP32 hierarchical deterministic node */
export interface HDNode {
    readonly publicKey: Buffer
    readonly privateKey: Buffer | null
    readonly chainCode: Buffer
    readonly address: string
    derive(index: number): HDNode
}

export namespace HDNode {

    /** create node from mnemonic words */
    export function fromMnemonic(words: string[], path=VET_DERIVATION_PATH) {
        // normalize words to lowercase
        const joinedWords = words.join(' ').toLowerCase()
        const node = ethers.HDNodeWallet.fromMnemonic(ethers.Mnemonic.fromPhrase(joinedWords), path)

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

        const node = ethers.HDNodeWallet.fromExtendedKey(ethers.encodeBase58(Buffer.concat([key, checksum]))) as ethers.HDNodeWallet

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

        const node = ethers.HDNodeWallet.fromExtendedKey(ethers.encodeBase58(Buffer.concat([key, checksum]))) as ethers.HDNodeWallet

        return createHDNode(node)
    }

    function createHDNode(ethersNode: ethers.HDNodeWallet): HDNode {
        const pub = Buffer.from(curve.keyFromPublic(ethersNode.publicKey.slice(2), 'hex').getPublic(false, 'array'))
        const priv = ethersNode.privateKey ? Buffer.from(ethersNode.privateKey.slice(2), 'hex') : null
        const cc = Buffer.from(ethersNode.chainCode.slice(2), 'hex')
        const addr = address.fromPublicKey(pub)

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
            get address() {
                return addr
            },
            derive(index) {
                return createHDNode(ethersNode.deriveChild(index))
            }
        }
    }

    function sha256(data: Buffer) {
        return createHash('sha256').update(data).digest()
    }
}
