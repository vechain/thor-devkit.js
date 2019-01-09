const ethABI = require('@vechain/web3-eth-abi');

(ethABI._types as [any]).forEach(t => {
    if (Object.getPrototypeOf(t).constructor.name === 'SolidityTypeAddress') {
        t._outputFormatter = (param: any, name: any) => {
            const value = param.staticPart()
            if (!value) {
                throw new Error('Couldn\'t decode ' + name + ' from ABI: 0x' + param.rawValue)
            }
            return '0x' + value.slice(value.length - 40, value.length)
        }
    }
})

/** encode/decode parameters of contract function call, event log, according to ABI JSON */
export namespace abi {
    /** for contract function */
    export class Function {
        /** the function signature, aka. 4 bytes prefix */
        public readonly signature: string

        /**
         * create a function object
         * @param definition abi definition of the function
         */
        constructor(public readonly definition: Function.Definition) {
            this.signature = ethABI.encodeFunctionSignature(definition)
        }

        /**
         * encode input parameters into call data
         * @param args arguments for the function
         */
        public encode(...args: any[]): string {
            return ethABI.encodeFunctionCall(this.definition, args)
        }

        /**
         * decode output data
         * @param outputData output data to decode
         */
        public decode(outputData: string) {
            return ethABI.decodeParameters(this.definition.outputs || [], outputData) as object
        }
    }

    export namespace Function {
        export type Type = 'function' | 'constructor' | 'fallback'
        export type StateMutability = 'pure' | 'view' | 'constant' | 'payable' | 'nonpayable'
        export interface Parameter {
            name: string
            type: string
        }

        export interface Definition {
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
        /** the event signature */
        public readonly signature: string

        /** for contract event */
        constructor(public readonly definition: Event.Definition) {
            this.signature = ethABI.encodeEventSignature(this.definition)
        }

        /**
         * encode an object of indexed keys into topics.
         * @param indexed an object contains indexed keys
         */
        public encode(indexed: object): Array<string | null> {
            const topics: Array<string | null> = []
            if (!this.definition.anonymous) {
                topics.push(this.signature)
            }
            for (const input of this.definition.inputs) {
                if (!input.indexed) {
                    continue
                }
                const value = (indexed as any)[input.name]
                if (value === undefined || value === null) {
                    topics.push(null)
                } else {
                    // TODO: special case for dynamic types
                    topics.push(ethABI.encodeParameter(input.type, value))
                }
            }
            return topics
        }

        /**
         * decode event log
         * @param data data in event output
         * @param topics topics in event
         */
        public decode(data: string, topics: string[]) {
            return ethABI.decodeLog(
                this.definition.inputs,
                data,
                this.definition.anonymous ? topics : topics.slice(1)) as object
        }
    }

    export namespace Event {
        export interface Parameter {
            name: string
            type: string
            indexed: boolean
        }

        export interface Definition {
            type: 'event'
            name: string
            anonymous?: boolean
            inputs: Parameter[]
        }
    }
}
