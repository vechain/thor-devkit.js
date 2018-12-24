import { blake2b256, publicKeyToAddress, secp256k1 } from './cry'
import { RLP } from './rlp'

/** Transaction class defines VeChainThor's multi-clause transaction */
export class Transaction {
    /** decode from Buffer to transaction */
    public static decode(raw: Buffer) {
        try {
            const body = unsignedTxRLP.decode(raw)
            return new Transaction(body)
        } catch {
            const body = txRLP.decode(raw)
            const sig = body.signature as string
            delete body.signature

            const tx = new Transaction(body)
            tx.signature = Buffer.from(sig.slice(2), 'hex')
            return tx
        }
    }

    public readonly body: Transaction.Body

    /** signature to transaction */
    public signature?: Buffer

    /**
     * construct a transaction object with given body
     * @param body body of tx
     */
    constructor(body: Transaction.Body) {
        this.body = { ...body, reserved: body.reserved || [] }
    }

    /**
     * returns transaction ID
     * null returned if something wrong (e.g. invalid signature)
     */
    get id() {
        if (!this.signature) {
            return null
        }
        try {
            const signingHash = blake2b256(unsignedTxRLP.encode(this.body))
            const pubKey = secp256k1.recover(signingHash, this.signature)
            const signer = publicKeyToAddress(pubKey)
            return '0x' + blake2b256(
                signingHash,
                signer,
            ).toString('hex')
        } catch {
            return null
        }
    }

    /** returns signer. null returned if no signature or not incorrectly signed */
    get signer() {
        if (!this.signature) {
            return null
        }
        try {
            const signingHash = blake2b256(unsignedTxRLP.encode(this.body))
            const pubKey = secp256k1.recover(signingHash, this.signature)
            return '0x' + publicKeyToAddress(pubKey).toString('hex')
        } catch {
            return null
        }
    }

    /** returns intrinsic gas it takes */
    get intrinsicGas() {
        return Transaction.intrinsicGas(this.body.clauses)
    }

    /** encode into Buffer */
    public encode() {
        if (this.signature) {
            const sigHex = '0x' + this.signature.toString('hex')
            return txRLP.encode({ ...this.body, signature: sigHex })
        }
        return unsignedTxRLP.encode(this.body)
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

    /** body type */
    export interface Body {
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

        reserved?: any[]
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
            if (data.substr(i, 2) === '00') {
                sum += zgas
            } else {
                sum += nzgas
            }
        }
        return sum
    }
}

const unsignedTxRLP = new RLP({
    name: 'tx',
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
        { name: 'reserved', kind: new RLP.RawKind() },
    ],
})

const txRLP = new RLP({
    name: 'tx',
    kind: [...(unsignedTxRLP.profile.kind as RLP.Profile[]), { name: 'signature', kind: new RLP.BlobKind() }],
})
