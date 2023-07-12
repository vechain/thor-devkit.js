import { expect } from "chai"
import { HDNode, OldHDNode, address, secp256k1 } from "../../src"


describe('hdnode regression check', () => {

    // Mnemonic words
    const words = 'ignore empty bird silly journey junior ripple have guard waste between tenant'.split(' ')

    // Public key and chain code
    const publicKey = Buffer.from('04dc40b4324626eb393dbf77b6930e915dcca6297b42508adb743674a8ad5c69a046010f801a62cb945a6cb137a050cefaba0572429fc4afc57df825bfca2f219a', 'hex')
    const chainCode = Buffer.from('105da5578eb3228655a8abe70bf4c317e525c7f7bb333634f5b7d1f70e111a33', 'hex')

    // Addresses for derivation
    const addresses = [
        '339fb3c438606519e2c75bbf531fb43a0f449a70',
        '5677099d06bc72f9da1113afa5e022feec424c8e',
        '86231b5cdcbfe751b9ddcd4bd981fc0a48afe921',
        'd6f184944335f26ea59dbb603e38e2d434220fcd',
        '2ac1a0aecd5c80fb5524348130ab7cf92670470a'
    ]

    /**
     * Compare derivation of child nodes.
     * 
     * @param child Child node generated with ethers.js official library
     * @param oldChild Child node generated with forked ethers.js library 
     * @param index Index of child node
     * @param addressesFixture Addresses of child nodes after derivation
     * @param nullPrivateKey If true, private key of child node MUST be expected null (case where derivation is made from public key)
     */
    const compareDerivation = (child: HDNode, oldChild: OldHDNode.HDNode, index: number, addressesFixture: Array<string>, nullPrivateKey: boolean) => {
        // For child
        expect(address.fromPublicKey(child.publicKey).slice(2)).equal(addressesFixture[index])
        expect(child.address).equal('0x' + addressesFixture[index])
        if(!nullPrivateKey) expect(secp256k1.derivePublicKey(child.privateKey!).toString('hex')).equal(child.publicKey.toString('hex'))
        else expect(child.privateKey).equal(null)

        // For old child
        expect(address.fromPublicKey(oldChild.publicKey).slice(2)).equal(addressesFixture[index])
        expect(oldChild.address).equal('0x' + addressesFixture[index])
        if(!nullPrivateKey) expect(secp256k1.derivePublicKey(oldChild.privateKey!).toString('hex')).equal(child.publicKey.toString('hex'))
        else expect(child.privateKey).equal(null)

        // Compare both
        expect(address.fromPublicKey(child.publicKey).slice(2)).equal(address.fromPublicKey(oldChild.publicKey).slice(2))
        expect(child.address).equal(oldChild.address)
        if(!nullPrivateKey) expect(secp256k1.derivePublicKey(child.privateKey!).toString('hex')).equal(secp256k1.derivePublicKey(oldChild.privateKey!).toString('hex'))
        else expect(child.privateKey).equal(null)
    }

    it('fromMnemonic', async () => {
        // Create node from mnemonic words
        const node = HDNode.fromMnemonic(words)
        const oldNode = OldHDNode.HDNode.fromMnemonic(words)

        // Check same node
        expect(JSON.stringify(node)).to.equal(JSON.stringify(oldNode))
    })

    it('fromPublicKey', async () => {
        // Create node from public key and chain code
        const node = HDNode.fromPublicKey(publicKey, chainCode)
        const oldNode = OldHDNode.HDNode.fromPublicKey(publicKey, chainCode)

        // Check same node
        expect(JSON.stringify(node)).to.equal(JSON.stringify(oldNode))
    })

    it('fromPrivateKey', async () => {
        // Temp node to get private key
        const tempNode = HDNode.fromMnemonic(words)

        // Create node from public key and chain code
        const node = HDNode.fromPrivateKey(tempNode.privateKey!, tempNode.chainCode)
        const oldNode = OldHDNode.HDNode.fromPrivateKey(tempNode.privateKey!, tempNode.chainCode)

        // Check same node
        expect(JSON.stringify(node)).to.equal(JSON.stringify(oldNode))
    })

    it('createHDNode', async () => {
        // Temp node to get private key
        const tempNode = HDNode.fromMnemonic(words)

        // Create node from MNEMONIC WORDS
        const node = HDNode.fromMnemonic(words)
        const oldNode = OldHDNode.HDNode.fromMnemonic(words)

        // Create node from PRIVATE KEY
        const xprivNode = HDNode.fromPrivateKey(tempNode.privateKey!, tempNode.chainCode)
        const xprivNodeOld = OldHDNode.HDNode.fromPrivateKey(tempNode.privateKey!, tempNode.chainCode)

        // Create node from PUBLIC KEY
        const xpubNode = HDNode.fromPublicKey(tempNode.publicKey, tempNode.chainCode)
        const xpubNodeOld = OldHDNode.HDNode.fromPublicKey(tempNode.publicKey, tempNode.chainCode)

        // Check same nodes
        for (let i = 0; i < 5; i++) {
            // Compare derivation for child nodes from MNEMONIC WORDS
            compareDerivation(node.derive(i), oldNode.derive(i), i, addresses, false)

            // Compare derivation for child nodes from PRIVATE KEY
            compareDerivation(xprivNode.derive(i), xprivNodeOld.derive(i), i, addresses, false)

            // Compare derivation for child nodes from PUBLIC KEY
            compareDerivation(xpubNode.derive(i), xpubNodeOld.derive(i), i, addresses, true)
        }
    })
})