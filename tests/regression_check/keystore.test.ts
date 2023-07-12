import { expect } from "chai"
import { Keystore, OldKeystore, secp256k1 } from "../../src"

describe('keystore regression check', () => {

    // Private key to encrypt and decrypt
    const privateKey = secp256k1.generatePrivateKey()

    it('encrypt and decrypt', async () => {
        // Encrypt same private key with new and old keystore
        const keyStore = await Keystore.encrypt(privateKey, '123')
        const oldKeyStore = await OldKeystore.Keystore.encrypt(privateKey, '123')

        // Decrypt both keystore and compare results
        const decryptedPrivateKey = await Keystore.decrypt(keyStore, '123')
        const oldDecryptedPrivateKey = await OldKeystore.Keystore.decrypt(oldKeyStore, '123')

        // Encryption and decryption should result in the same private key
        expect(decryptedPrivateKey).deep.equal(privateKey)
        expect(oldDecryptedPrivateKey).deep.equal(privateKey)

        // Encryption and decryption should result in the same keystore
        expect(decryptedPrivateKey).deep.equal(oldDecryptedPrivateKey)
    })
})