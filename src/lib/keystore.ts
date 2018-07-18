import { randomBytes } from 'crypto'
const Keythereum = require('keythereum')

/** to present encrypted private key in Ethereum keystore format. */
export type Keystore = {
    address: string
    crypto: object
    id: string
    version: number
}

export namespace Keystore {
    /**
     * encrypt private key to keystore with given password
     * @param privateKey the private key to be encrypted
     * @param password 
     */
    export function encrypt(privateKey: Buffer, password: string) {
        return new Promise<Keystore>(resolve => {
            Keythereum.dump(password, privateKey, randomBytes(32), randomBytes(16), {
                kdf: "scrypt",
                cipher: "aes-128-ctr",
                kdfparams: {
                    memory: 280000000,
                    dklen: 32,
                    n: 262144,
                    r: 8,
                    p: 1
                }
            }, resolve)
        })
    }

    /**
     * decrypt private key from keystore
     * @param ks the keystore
     * @param password 
     */
    export function decrypt(ks: Keystore, password: string) {
        return new Promise<Buffer>((resolve, reject) => {
            Keythereum.recover(password, ks, (r: Buffer | Error) => {
                if (!Buffer.isBuffer(r)) {
                    return reject(r)
                }
                resolve(r)
            })
        })
    }

    /**
     * roughly check whether keystore is well formed
     * @param ks the keystore
     */
    export function wellFormed(ks: Keystore) {
        if (ks.version !== 1 && ks.version !== 3)
            return false
        if (!/^[0-9a-f]{40}$/i.test(ks.address))
            return false
        if (!/^[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/.test(ks.id))
            return false
        if (typeof ks.crypto !== 'object')
            return false
        return true
    }
}
