import { address } from './address'
import { blake2b256 } from './blake2b'
import { RLP } from './rlp'
import { secp256k1 } from './secp256k1'
import { Buffer } from 'buffer'

/** Transaction class defines VeChainThor's multi-clause transaction */
export class Transaction {
    public static readonly DELEGATED_MASK = 1

    /** decode from Buffer to transaction
     * @param raw encoded buffer
     * @param unsigned to indicator if the encoded buffer contains signature
     */
    public static decode(raw: Buffer, unsigned?: boolean) {
        let type: Transaction.Type
        if (raw.length > 0 && raw[0] > 0x7f) {
            type = Transaction.Type.Legacy
        } else {
            if (raw.length === 0) {
                throw new Error('typed transaction too short')
            }
            if (raw[0] === Transaction.Type.DynamicFee) {
                type = Transaction.Type.DynamicFee
                // remove type identifier for subsequent decoding
                raw = raw.slice(1)
            } else {
                throw new Error('transaction type not supported: ' + raw[0])
            }
        }

        let body: Transaction.Body
        let signature: Buffer | undefined
        if (unsigned) {
            body = type === Transaction.Type.DynamicFee ?
                unsignedDynamicFeeTxRLP.decode(raw) :
                unsignedLegacyTxRLP.decode(raw)
            body.type = type
        } else {
            const decoded = type === Transaction.Type.DynamicFee ?
                dynamicFeeTxRLP.decode(raw) :
                legacyTxRLP.decode(raw)

            signature = decoded.signature as Buffer
            delete decoded.signature
            body = decoded
            body.type = type
        }

        const reserved = body.reserved as Buffer[]
        if (reserved.length > 0) {
            if (reserved[reserved.length - 1].length === 0) {
                throw new Error('invalid reserved fields: not trimmed')
            }

            const features = featuresKind.buffer(reserved[0], 'reserved.features').decode() as number
            body.reserved = {
                features
            }
            if (reserved.length > 1) {
                body.reserved.unused = reserved.slice(1)
            }
        } else {
            delete body.reserved
        }

        const tx = new Transaction(body)
        if (signature) {
            tx.signature = signature
        }
        return tx
    }

    public readonly body: Transaction.Body

    /** signature to transaction */
    public signature?: Buffer

    /**
     * construct a transaction object with given body
     * @param body body of tx
     */
    constructor(body: Transaction.Body) {
        this.body = { ...body }
    }

    /**
     * returns transaction ID
     * null returned if something wrong (e.g. invalid signature)
     */
    get id() {
        if (!this._signatureValid) {
            return null
        }
        try {
            const signingHash = this.signingHash()
            const pubKey = secp256k1.recover(signingHash, this.signature!.slice(0, 65))
            const origin = address.fromPublicKey(pubKey)
            return '0x' + blake2b256(
                signingHash,
                Buffer.from(origin.slice(2), 'hex'),
            ).toString('hex')
        } catch {
            return null
        }
    }

    /** returns transaction type, type legacy will return if type is not set */
    get type() {
        if (this.body.type && this.body.type === Transaction.Type.DynamicFee) {
            return Transaction.Type.DynamicFee
        }
        return Transaction.Type.Legacy
    }

    /**
     * compute signing hashes.
     * It returns tx hash for origin or delegator depends on param `delegateFor`.
     * @param delegateFor address of intended tx origin. If set, the returned hash is for delegator to sign.
     */
    public signingHash(delegateFor?: string) {
        this.checkType()

        const reserved = this._encodeReserved()
        let buf: Buffer
        if (this.type === Transaction.Type.DynamicFee) {
            const raw = unsignedDynamicFeeTxRLP.encode({ ...this.body, reserved })
            buf = Buffer.concat([Buffer.from([Transaction.Type.DynamicFee]), raw])
        } else {
            buf = unsignedLegacyTxRLP.encode({ ...this.body, reserved })
        }

        const hash = blake2b256(buf)
        if (delegateFor) {
            if (!/^0x[0-9a-f]{40}$/i.test(delegateFor)) {
                throw new Error('delegateFor expected address')
            }
            return blake2b256(hash, Buffer.from(delegateFor.slice(2), 'hex'))
        }
        return hash
    }

    /** returns tx origin. null returned if no signature or not incorrectly signed */
    get origin() {
        if (!this._signatureValid) {
            return null
        }

        try {
            const signingHash = this.signingHash()
            const pubKey = secp256k1.recover(signingHash, this.signature!.slice(0, 65))
            return address.fromPublicKey(pubKey)
        } catch {
            return null
        }
    }

    /** returns tx delegator. null returned if no signature or not incorrectly signed */
    get delegator() {
        if (!this.delegated) {
            return null
        }
        if (!this._signatureValid) {
            return null
        }

        const origin = this.origin
        if (!origin) {
            return null
        }

        try {
            const signingHash = this.signingHash(origin)
            const pubKey = secp256k1.recover(signingHash, this.signature!.slice(65))
            return address.fromPublicKey(pubKey)
        } catch {
            return null
        }
    }

    /** returns whether delegated. see https://github.com/vechain/VIPs/blob/master/vips/VIP-191.md */
    get delegated() {
        // tslint:disable-next-line:no-bitwise
        return (((this.body.reserved ?? {}).features ?? 0) & Transaction.DELEGATED_MASK) === Transaction.DELEGATED_MASK
    }

    /** returns intrinsic gas it takes */
    get intrinsicGas() {
        return Transaction.intrinsicGas(this.body.clauses)
    }

    /** encode into Buffer */
    public encode() {
        this.checkType()
        const reserved = this._encodeReserved()

        if (this.type === Transaction.Type.DynamicFee) {
            const raw = this.signature ?
                dynamicFeeTxRLP.encode({ ...this.body, reserved, signature: this.signature }) :
                unsignedDynamicFeeTxRLP.encode({ ...this.body, reserved })
            return Buffer.concat([Buffer.from([Transaction.Type.DynamicFee]), raw])
        }

        return this.signature ?
            legacyTxRLP.encode({ ...this.body, reserved, signature: this.signature }) :
            unsignedLegacyTxRLP.encode({ ...this.body, reserved })
    }

    private _encodeReserved() {
        const reserved = this.body.reserved ?? {}
        const list = [featuresKind.data(reserved.features ?? 0, 'reserved.features').encode(),
        ...(reserved.unused ?? [])]

        // trim
        while (list.length > 0) {
            if (list[list.length - 1].length === 0) {
                list.pop()
            } else {
                break
            }
        }
        return list
    }

    private get _signatureValid() {
        const expectedSigLen = this.delegated ? 65 * 2 : 65
        return this.signature ? this.signature.length === expectedSigLen : false
    }

    private checkType() {
        // allow type to be undefined to be compatible with older spec
        if (this.body.hasOwnProperty('type') && this.body.type !== undefined &&
            this.body.type !== Transaction.Type.Legacy && this.body.type !== Transaction.Type.DynamicFee) {
            throw new Error('unsupported transaction type: ' + this.body.type)
        }
    }
}

export namespace Transaction {
    /** clause type */
    export interface Clause {
        /**
         * destination address where transfer token to, or invoke contract method on.
         * set null destination to deploy a contract.
         */
        to: string | null

        /** amount of token to transfer to the destination */
        value: string | number

        /** input data for contract method invocation or deployment */
        data: string
    }

    export enum Type {
        Legacy = 0,
        DynamicFee = 81,
    }

    export type Body = LegacyBody | DynamicFeeBody

    /** legacy transaction body type */
    export interface LegacyBody {
        type?: Type.Legacy
        /** last byte of genesis block ID */
        chainTag: number
        /** 8 bytes prefix of some block's ID */
        blockRef: string
        /** constraint of time bucket */
        expiration: number
        /** array of clauses */
        clauses: Clause[]
        /** coef applied to base gas price [0,255] */
        gasPriceCoef: number
        /** max gas provided for execution */
        gas: string | number
        /** ID of another tx that is depended */
        dependsOn: string | null
        /** nonce value for various purposes */
        nonce: string | number

        reserved?: {
            /** tx feature bits */
            features?: number
            unused?: Buffer[]
        }
    }

    /** dynamic fee transaction body type */
    export interface DynamicFeeBody {
        type: Type.DynamicFee
        /** last byte of genesis block ID */
        chainTag: number
        /** 8 bytes prefix of some block's ID */
        blockRef: string
        /** constraint of time bucket */
        expiration: number
        /** array of clauses */
        clauses: Clause[]
        /** max priority fee per gas */
        maxPriorityFeePerGas: string | number
        /** max fee per gas */
        maxFeePerGas: string | number
        /** max gas provided for execution */
        gas: string | number
        /** ID of another tx that is depended */
        dependsOn: string | null
        /** nonce value for various purposes */
        nonce: string | number

        reserved?: {
            /** tx feature bits */
            features?: number
            unused?: Buffer[]
        }
    }

    /**
     * calculates intrinsic gas that a tx costs with the given clauses.
     * @param clauses
     */
    export function intrinsicGas(clauses: Clause[]) {
        const txGas = 5000
        const clauseGas = 16000
        const clauseGasContractCreation = 48000

        if (clauses.length === 0) {
            return txGas + clauseGas
        }

        return clauses.reduce((sum, c) => {
            if (c.to) {
                sum += clauseGas
            } else {
                sum += clauseGasContractCreation
            }
            sum += dataGas(c.data)
            return sum
        }, txGas)
    }

    function dataGas(data: string) {
        const zgas = 4
        const nzgas = 68

        let sum = 0
        for (let i = 2; i < data.length; i += 2) {
            if (data.substring(i, i + 2) === '00') {
                sum += zgas
            } else {
                sum += nzgas
            }
        }
        return sum
    }
}

const unsignedLegacyTxRLP = new RLP({
    name: 'unsigned legacy tx',
    kind: [
        { name: 'chainTag', kind: new RLP.NumericKind(1) },
        { name: 'blockRef', kind: new RLP.CompactFixedBlobKind(8) },
        { name: 'expiration', kind: new RLP.NumericKind(4) },
        {
            name: 'clauses', kind: {
                item: [
                    { name: 'to', kind: new RLP.NullableFixedBlobKind(20) },
                    { name: 'value', kind: new RLP.NumericKind(32) },
                    { name: 'data', kind: new RLP.BlobKind() },
                ],
            },
        },
        { name: 'gasPriceCoef', kind: new RLP.NumericKind(1) },
        { name: 'gas', kind: new RLP.NumericKind(8) },
        { name: 'dependsOn', kind: new RLP.NullableFixedBlobKind(32) },
        { name: 'nonce', kind: new RLP.NumericKind(8) },
        { name: 'reserved', kind: { item: new RLP.BufferKind() } },
    ],
})

const legacyTxRLP = new RLP({
    name: 'legacy tx',
    kind: [...(unsignedLegacyTxRLP.profile.kind as RLP.Profile[]), { name: 'signature', kind: new RLP.BufferKind() }],
})

const unsignedDynamicFeeTxRLP = new RLP({
    name: 'unsigned dynamic fee tx',
    kind: [
        { name: 'chainTag', kind: new RLP.NumericKind(1) },
        { name: 'blockRef', kind: new RLP.CompactFixedBlobKind(8) },
        { name: 'expiration', kind: new RLP.NumericKind(4) },
        {
            name: 'clauses', kind: {
                item: [
                    { name: 'to', kind: new RLP.NullableFixedBlobKind(20) },
                    { name: 'value', kind: new RLP.NumericKind(32) },
                    { name: 'data', kind: new RLP.BlobKind() },
                ],
            },
        },
        { name: 'maxPriorityFeePerGas', kind: new RLP.NumericKind(32) },
        { name: 'maxFeePerGas', kind: new RLP.NumericKind(32) },
        { name: 'gas', kind: new RLP.NumericKind(8) },
        { name: 'dependsOn', kind: new RLP.NullableFixedBlobKind(32) },
        { name: 'nonce', kind: new RLP.NumericKind(8) },
        { name: 'reserved', kind: { item: new RLP.BufferKind() } },
    ],
})

const dynamicFeeTxRLP = new RLP({
    name: 'dynamic fee tx',
    // tslint:disable-next-line:max-line-length
    kind: [...(unsignedDynamicFeeTxRLP.profile.kind as RLP.Profile[]), { name: 'signature', kind: new RLP.BufferKind() }],
})

const featuresKind = new RLP.NumericKind(4)
