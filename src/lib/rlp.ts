import { BigNumber } from 'bignumber.js'
const _rlp = require('rlp')


/** base class of scalar kind */
export abstract class ScalarKind {
    protected constructor() { }
    abstract encode(data: any, ctx: string): Buffer
    abstract decode(buf: Buffer, ctx: string): any
}

/** a noop scalar kind */
export class RawKind extends ScalarKind {
    constructor() { super() }

    encode(data: any, ctx: string) {
        return data
    }
    decode(buf: any, ctx: string) {
        return buf
    }
}

/** a scalar kind to presents number */
export class NumericKind extends ScalarKind {
    /**
     * create a numeric kind
     * @param maxBytes up limit of data in bytes
     */
    constructor(readonly maxBytes?: number) {
        super()
    }

    encode(data: string | number, ctx: string) {
        assert(typeof data === 'string' || typeof data === 'number', ctx,
            'expected string or number')
        if (typeof data === 'string') {
            assert(isHexString(data), ctx,
                'expected non-negative integer in hex string')
            assert(data.length > 2, ctx, 'expected valid hex string')
        } else {
            assert(Number.isSafeInteger(data) && data >= 0, ctx,
                'expected non-negative safe integer')
        }

        let bn = new BigNumber(data)
        if (bn.isZero())
            return Buffer.alloc(0)

        let hex = bn.toString(16)
        if (hex.length % 2 != 0)
            hex = '0' + hex

        let buf = Buffer.from(hex, 'hex')
        assert(this.maxBytes ? buf.length <= this.maxBytes : true, ctx,
            `expected number in ${this.maxBytes} bytes`)
        return buf
    }

    decode(buf: Buffer, ctx: string) {
        assert(this.maxBytes ? buf.length <= this.maxBytes : true, ctx,
            `expected less than ${this.maxBytes} bytes`)
        assert(buf.length > 0 ? buf[0] !== 0 : true, ctx,
            `expected canonical integer (no leading zero bytes)`)
        let bn = new BigNumber('0x' + buf.toString('hex'))
        let num = bn.toNumber()
        return Number.isSafeInteger(num) ? num : '0x' + bn.toString(16)
    }
}

/** a scalar kind to present fixed length blob */
export class BlobKind extends ScalarKind {
    /**
     * create blob kind
     * @param bytes size of blob in bytes 
     */
    constructor(readonly bytes: number) {
        super()
    }

    encode(data: string, ctx: string) {
        assert(isHexString(data), ctx,
            'expected hex string')
        assert(data.length === this.bytes * 2 + 2, ctx,
            `expected hex string presents ${this.bytes} bytes`)
        return Buffer.from(data.slice(2), 'hex')
    }

    decode(buf: Buffer, ctx: string) {
        assert(buf.length === this.bytes, ctx,
            `expected ${this.bytes} bytes`)
        return '0x' + buf.toString('hex')
    }
}

/** blob kind that can be null */
export class NullableBlobKind extends BlobKind {
    encode(data: string | null, ctx: string) {
        if (data) return super.encode(data, ctx)
        return Buffer.alloc(0)
    }
    decode(buf: Buffer, ctx: string): any {
        if (buf.length === 0) return null
        return super.decode(buf, ctx)
    }
}

/** a blob kind that leading zero will be removed when encoded */
export class TrimmedBlobKind extends BlobKind {
    encode(data: string, ctx: string) {
        let buf = super.encode(data, ctx)
        let nzIndex = buf.findIndex(v => v !== 0)
        if (nzIndex > 0)
            buf = buf.slice(nzIndex)
        return buf
    }

    decode(buf: Buffer, ctx: string) {
        assert(buf.length <= this.bytes, ctx,
            `expected less than ${this.bytes} bytes`)

        let zeros = '0'.repeat((this.bytes - buf.length) * 2)
        return '0x' + zeros + buf.toString('hex')
    }
}

/** a blob kind with variable length */
export class VariableBlobKind extends BlobKind {
    constructor(maxBytes?: number) {
        if (maxBytes)
            super(maxBytes)
        else
            super(Number.MAX_SAFE_INTEGER)
    }

    encode(data: string, ctx: string) {
        assert(isHexString(data), ctx,
            'expected hex string')
        assert(data.length % 2 === 0, ctx,
            'expected even length hex')
        let buf = Buffer.from(data.slice(2), 'hex')
        assert(buf.length <= this.bytes, ctx,
            `expected less than ${this.bytes} bytes`)
        return buf
    }

    decode(buf: Buffer, ctx: string) {
        assert(buf.length <= this.bytes, ctx,
            `expected less than ${this.bytes} bytes`)
        return '0x' + buf.toString('hex')
    }
}


/** a list of items in one kind */
export type ArrayKind = { item: Profile['kind'] }
/** a list of items in each kinds */
export type StructKind = Profile[]

/** presents a list item */
export type Profile = {
    name: string
    kind: ScalarKind | ArrayKind | StructKind
}

/**
 * encode data according to profile
 * @param obj the data to be encoded
 * @param profile 
 */
export function encode(obj: any, profile: Profile) {
    let packed = pack(obj, profile, '')
    return _rlp.encode(packed) as Buffer
}

/**
 * decode encoded data according to profile
 * @param data rlp encoded data
 * @param profile 
 */
export function decode(data: Buffer, profile: Profile) {
    let packed = _rlp.decode(data)
    return unpack(packed, profile, '')
}

function pack(obj: any, profile: Profile, ctx: string): any {
    ctx = ctx ? ctx + '.' + profile.name : profile.name
    let kind = profile.kind
    if (kind instanceof ScalarKind)
        return kind.encode(obj, ctx)

    if (Array.isArray(kind)) {
        return kind.map(k => pack(obj[k.name], k, ctx))
    }

    assert(Array.isArray(obj), ctx,
        'expected array')
    let item = kind.item
    return (obj as any[]).map((part, i) => pack(part, { name: '#' + i, kind: item }, ctx))
}

function unpack(packed: any, profile: Profile, ctx: string): any {
    ctx = ctx ? ctx + '.' + profile.name : profile.name
    let kind = profile.kind
    if (kind instanceof ScalarKind) {
        if (!(kind instanceof RawKind)) {
            assert(Buffer.isBuffer(packed), ctx,
                'expected Buffer')
        }
        return kind.decode(packed, ctx)
    }

    if (Array.isArray(kind)) {
        assert(Array.isArray(packed), ctx,
            'expected array')
        let parts = packed as any[]
        assert(parts.length === kind.length, ctx,
            `expected ${kind.length} items, but got ${parts.length}`)
        return kind.reduce((o, p, i) => {
            o[p.name] = unpack(parts[i], p, ctx)
            return o
        }, {} as any)
    }

    assert(Array.isArray(packed), ctx,
        'expected array')
    let item = kind.item
    return (packed as any[]).map((part, i) => unpack(part, { name: '#' + i, kind: item }, ctx))
}

function assert(cond: boolean, ctx: string, msg: string) {
    if (!cond) throw new Error(`${ctx}: ${msg}`)
}

function isHexString(str: string) {
    return /^0x[0-9a-f]*$/i.test(str)
}


