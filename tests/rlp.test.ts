import { expect } from 'chai'
import { rlp } from '../src'

describe('rlp', () => {
    it('rawKind', () => {
        let kind = new rlp.RawKind()
        expect(kind.encode('foo', '')).equal('foo')
        expect(kind.decode('bar', '')).equal('bar')
    })

    it('numericKind encode', () => {
        let kind = new rlp.NumericKind(8)

        expect(kind.encode('0x0', '').toString('hex')).equal('')
        expect(kind.encode('0x123', '').toString('hex')).equal('0123')
        expect(kind.encode(0, '').toString('hex')).equal('')
        expect(kind.encode(0x123, '').toString('hex')).equal('0123')

        expect(() => { kind.encode('0x123z', '') }).to.throw()
        expect(() => { kind.encode({} as any, '') }).to.throw()
        expect(() => { kind.encode('0x', '') }).to.throw()
        expect(() => { kind.encode(-1, '') }).to.throw()
        expect(() => { kind.encode('0x12345678123456780', ''), 'exceeds max bytes' }, 'exceed max bytes').to.throw()
        expect(() => { kind.encode(2 ** 64, ''), 'unsafe integer' }, 'exceed max bytes').to.throw()
    })
    it('numericKind decode', () => {
        let kind = new rlp.NumericKind(8)
        expect(kind.decode(Buffer.from([1, 2, 3]), '')).equal(0x010203)
        expect(kind.decode(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]), '')).equal('0x102030405060708')

        expect(() => { kind.decode(Buffer.alloc(9, 1), '') }, 'exceeds max bytes').to.throw()
        expect(() => { kind.decode(Buffer.from([0, 1]), '') }, 'with leading zero').to.throw()
    })

    it('blobKind encode', () => {
        let kind = new rlp.BlobKind(4)
        expect(kind.encode('0x12345678', '').toString('hex')).equal('12345678')

        expect(() => { kind.encode('0x1234567z', '') }).to.throw()
        expect(() => { kind.encode('0x11', '') }).to.throw()
        expect(() => { kind.encode('0x1234567890', '') }).to.throw()
        expect(() => { kind.encode('0x1234567', 'odd hex') }).to.throw()
        expect(() => { kind.encode(1 as any, '') }).to.throw()
        expect(() => { kind.encode(null as any, '') }).to.throw()
    })

    it('blobKind decode', () => {
        let kind = new rlp.BlobKind(4)
        expect(kind.decode(Buffer.from([1, 2, 3, 4]), '')).equal('0x01020304')

        expect(() => { kind.decode(Buffer.alloc(2), '') }).to.throw()
        expect(() => { kind.decode(Buffer.alloc(0), '') }).to.throw()
    })

    it('nullableBlobKind encode', () => {
        let kind = new rlp.NullableBlobKind(4)
        expect(kind.encode(null, '').toString('hex')).equal('')
        expect(kind.encode('0x12345678', '').toString('hex')).equal('12345678')

        expect(() => { kind.encode('0x1234567z', '') }).to.throw()
        expect(() => { kind.encode('0x11', '') }).to.throw()
        expect(() => { kind.encode('0x1234567890', '') }).to.throw()
        expect(() => { kind.encode('0x1234567', 'odd hex') }).to.throw()
        expect(() => { kind.encode(1 as any, '') }).to.throw()

        expect(() => { kind.encode('0x', '') }).to.throw()
    })

    it('nullableBlobKind decode', () => {
        let kind = new rlp.NullableBlobKind(4)
        expect(kind.decode(Buffer.alloc(0), '')).equal(null)
        expect(kind.decode(Buffer.from([1, 2, 3, 4]), '')).equal('0x01020304')

        expect(() => { kind.decode(Buffer.alloc(2), '') }).to.throw()
    })

    it('trimmedBlobKind encode', () => {
        let kind = new rlp.TrimmedBlobKind(4)
        expect(kind.encode('0x00112233', '').toString('hex')).equal('112233')
    })

    it('trimmedBlobKind decode', () => {
        let kind = new rlp.TrimmedBlobKind(4)
        expect(kind.decode(Buffer.from([1]), '')).equal('0x00000001')
    })


    it('variableBlobKind encode', () => {
        let kind = new rlp.VariableBlobKind()
        expect(kind.encode('0x1234567890', '').toString('hex'))
            .equal('1234567890')

        expect(() => { kind.encode('0x1', '') }, 'odd hex').to.throw()
        expect(() => { kind.encode('0xxy', '') }).to.throw()
        expect(() => { kind.encode(1 as any, '') }).to.throw()

        kind = new rlp.VariableBlobKind(4)
        expect(() => { kind.encode('0x1234567890', '') }, 'exceeds max bytes').to.throw()
    })

    it('variableBlobKind decode', () => {
        let kind = new rlp.VariableBlobKind()
        expect(kind.decode(Buffer.from([1, 2, 3, 4, 5]), '')).equal('0x0102030405')


        kind = new rlp.VariableBlobKind(4)
        expect(() => { kind.decode(Buffer.from([1, 2, 3, 4, 5]), '') }, 'exceeds max bytes').to.throw()
    })


    let profile: rlp.Profile = {
        name: '',
        kind: [
            { name: 'foo', kind: new rlp.NumericKind() },
            { name: 'bar', kind: new rlp.BlobKind(4) },
            {
                name: 'baz', kind: {
                    item: [
                        { name: 'x', kind: new rlp.VariableBlobKind() },
                        { name: 'y', kind: new rlp.NumericKind() },
                    ]
                }
            }
        ]
    }

    let data = {
        foo: 123,
        bar: '0x12345678',
        baz: [
            { x: '0x11', y: 1234 },
            { x: '0x12', y: 5678 }
        ]
    }

    it('encode', () => {
        let buf = rlp.encode(data, profile)
        expect(buf.toString('hex')).equal('d17b8412345678cac4118204d2c41282162e')
    })

    it('decode', () => {
        let dec = rlp.decode(Buffer.from('d17b8412345678cac4118204d2c41282162e', 'hex'), profile)
        expect(dec).deep.equal(data)
    })
})
