import { blake2b256, publicKeyToAddress, secp256k1 } from './crypto'
import * as rlp from './rlp'

/** Transaction class defines VeChainThor's multi-clause transaction */
export class Transaction {
    readonly body: Transaction.Body

    /** signature to transaction */
    signature?: Buffer

    /**
     * construct a transaction object with given body
     * @param body 
     */
    constructor(body: Transaction.Body) {
        this.body = { ...body, reserved: body.reserved || [] }
    }

    /** returns hash for signing */
    get signingHash() {
        let data = rlp.encode({ ...this.body, reserved: [] }, { name: '', kind: fields })
        return blake2b256(data)
    }

    /**
     * returns transaction ID
     * zero ID returned if something wrong (e.g. invalid signature)
     */
    get id() {
        try {
            let pubKey = secp256k1.recover(this.signingHash, this.signature!)
            let signer = publicKeyToAddress(pubKey)
            return '0x' + blake2b256(
                this.signingHash,
                signer,
            ).toString('hex')
        } catch{
            return '0x0000000000000000000000000000000000000000000000000000000000000000'
        }
    }

    /** returns signer */
    get signer() {
        let pubKey = secp256k1.recover(this.signingHash, this.signature!)
        return '0x' + publicKeyToAddress(pubKey).toString('hex')
    }

    /** returns intrinsic gas it takes */
    get intrinsicGas() {
        return Transaction.intrinsicGas(this.body.clauses)
    }

    /** encode into Buffer */
    encode() {
        if (this.signature) {
            let sigHex = '0x' + this.signature.toString('hex')
            return rlp.encode({ ...this.body, signature: sigHex }, { name: '', kind: fieldsWithSig })
        }
        return rlp.encode(this.body, { name: '', kind: fields })
    }

    /** decode from Buffer to transaction */
    static decode(raw: Buffer) {
        try {
            let body = rlp.decode(raw, { name: '', kind: fields })
            return new Transaction(body)
        } catch{
            let body = rlp.decode(raw, { name: '', kind: fieldsWithSig })
            let sig = body.signature as string
            delete body['signature']
            let tx = new Transaction(body)

            tx.signature = Buffer.from(sig.slice(2), 'hex')
            return tx
        }
    }
}

export namespace Transaction {
    /** clause type */
    export type Clause = {
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
    export type Body = {
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

        if (clauses.length === 0)
            return txGas + clauseGas

        return clauses.reduce((sum, c) => {
            if (c.to)
                sum += clauseGas
            else
                sum += clauseGasContractCreation
            sum += dataGas(c.data)
            return sum
        }, txGas)
    }

    function dataGas(data: string) {
        const zgas = 4
        const nzgas = 68

        let sum = 0
        for (let i = 2; i < data.length; i += 2) {
            if (data.substr(i, 2) === '00')
                sum += zgas
            else
                sum += nzgas
        }
        return sum
    }
}

const fields: rlp.Profile[] = [
    { name: 'chainTag', kind: new rlp.NumericKind(1) },
    { name: 'blockRef', kind: new rlp.TrimmedBlobKind(8) },
    { name: 'expiration', kind: new rlp.NumericKind(4) },
    {
        name: 'clauses', kind: {
            item: [
                { name: 'to', kind: new rlp.NullableBlobKind(20) },
                { name: 'value', kind: new rlp.NumericKind(32) },
                { name: 'data', kind: new rlp.VariableBlobKind() },
            ]
        }
    },
    { name: 'gasPriceCoef', kind: new rlp.NumericKind(1) },
    { name: 'gas', kind: new rlp.NumericKind(8) },
    { name: 'dependsOn', kind: new rlp.NullableBlobKind(32) },
    { name: 'nonce', kind: new rlp.NumericKind(8) },
    { name: 'reserved', kind: new rlp.RawKind() }
]

const fieldsWithSig = [
    ...fields,
    { name: 'signature', kind: new rlp.VariableBlobKind() }
]
