const keccak = require('keccak')

/**
 * computes keccak256 hash of given data
 * @param data one or more Buffer | string
 */
export function keccak256(...data: Array<Buffer | string>) {
    const h = keccak('keccak256')
    data.forEach(d => {
        if (Buffer.isBuffer(d)) {
            h.update(d)
        } else {
            h.update(Buffer.from(d, 'utf8'))
        }
    })
    return h.digest() as Buffer
}
