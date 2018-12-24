import { keccak256 } from './keccak'
/**
 * derive Address from public key
 * @param pubKey the public key
 */
export function publicKeyToAddress(pubKey: Buffer) {
    return keccak256(pubKey.slice(1)).slice(12)
}

/**
 * to check if a value presents an address
 * @param v the value to be checked
 */
export function isAddress(v: any): v is string {
    return typeof v === 'string' && /^0x[0-9a-f]{40}$/i.test(v)
}

/**
 * encode the address to checksum address that is compatible with eip-55
 * @param address input address
 */
export function toChecksumAddress(address: string) {
    if (!isAddress(address)) {
        throw new Error('invalid address')
    }
    address = address.slice(2).toLowerCase()
    const hash = keccak256(address)

    let checksumAddress = '0x'
    for (let i = 0; i < address.length; i++) {
        // tslint:disable-next-line:no-bitwise
        let byte = hash[i >> 1]
        if (i % 2 === 0) {
            // tslint:disable-next-line:no-bitwise
            byte >>= 4
        }

        if (byte % 16 >= 8) {
            checksumAddress += address[i].toUpperCase()
        } else {
            checksumAddress += address[i]
        }
    }
    return checksumAddress
}
