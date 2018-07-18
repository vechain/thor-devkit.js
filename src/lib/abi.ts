const ethABI = require('web3-eth-abi')

/** encode/decode parameters of contract function call, event log, according to ABI JSON */
export namespace abi {
    /** for contract function */
    export class Function {
        /**
         * create a function object
         * @param definition 
         */
        constructor(public readonly definition: Function.Definition) { }

        /** compute function signature */
        get signature(): string {
            return ethABI.encodeFunctionSignature(this.definition)
        }

        /**
         * encode input parameters into call data
         * @param parameters 
         */
        encode(...parameters: (string | number | boolean | Buffer)[]): string {
            return ethABI.encodeFunctionCall(this.definition, parameters)
        }

        /**
         * decode output data
         * @param outputData 
         */
        decode(outputData: string) {
            return ethABI.decodeParameters(this.definition.outputs || [], outputData) as object
        }
    }

    export namespace Function {
        export type Type = 'function' | 'constructor' | 'fallback'
        export type StateMutability = 'pure' | 'view' | 'constant' | 'payable' | 'nonpayable'
        export type Parameter = {
            name: string
            type: string
        }

        export type Definition = {
            type?: Type
            name?: string
            constant?: boolean
            payable: boolean
            stateMutability: StateMutability
            inputs?: Parameter[]
            outputs?: Parameter[]
        }
    }

    /** for contract event */
    export class Event {
        /** for contract event */
        constructor(public readonly definition: Event.Definition) { }

        /** compute event signature */
        get signature(): string {
            return ethABI.encodeEventSignature(this.definition)
        }

        /**
         * decode event log
         * @param data 
         * @param topics 
         */
        decode(data: string, topics: string[]) {
            return ethABI.decodeLog(this.definition.inputs, data, this.definition.anonymous ? topics: topics.slice(1)) as object
        }
    }

    export namespace Event {
        export type Parameter = {
            name: string
            type: string
            indexed: boolean
        }

        export type Definition = {
            type: 'event'
            name: string
            anonymous?: boolean
            inputs: Parameter[]
        }
    }
}
