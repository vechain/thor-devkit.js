import { keccak256 } from './keccak'
/**
 * derive Address from public key
 * @param pubKey the public key
 */
export function publicKeyToAddress(pubKey: Buffer) {
    return keccak256(pubKey.slice(1)).slice(12)
}
