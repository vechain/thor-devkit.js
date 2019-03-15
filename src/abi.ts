const ethABI = require('@vechain/web3-eth-abi');

// avoid address checksumed
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

    /**
     * encode single parameter
     * @param type type of the parameter
     * @param value value of the parameter
     * @returns encoded value in hex string
     */
    export function encodeParameter(type: string, value: any) {
        return ethABI.encodeParameter(type, value) as string
    }

    /**
     * decode single parameter
     * @param type type of the parameter
     * @param data encoded parameter in hex string
     * @returns decoded value
     */
    export function decodeParameter(type: string, data: string) {
        return ethABI.decodeParameter(type, data) as string
    }

    /**
     * encode a group of parameters
     * @param types type array
     * @param values value array
     * @returns encoded values in hex string
     */
    export function encodeParameters(types: Function.Parameter[], values: any[]) {
        return ethABI.encodeParameters(types.map(p => p.type), values) as string
    }

    /**
     * decode a group of parameters
     * @param types type array
     * @param data encoded values in hex string
     * @returns decoded object
     */
    export function decodeParameters(types: Function.Parameter[], data: string) {
        return ethABI.decodeParameters(types, data) as Decoded
    }

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
            return this.signature + encodeParameters(this.definition.inputs, args).slice(2)
        }

        /**
         * decode output data
         * @param outputData output data to decode
         */
        public decode(outputData: string) {
            return decodeParameters(this.definition.outputs, outputData)
        }
    }

    export namespace Function {
        export type StateMutability = 'pure' | 'view' | 'constant' | 'payable' | 'nonpayable'
        export interface Parameter {
            name: string
            type: string
        }

        export interface Definition {
            type: 'function'
            name: string
            constant?: boolean
            payable: boolean
            stateMutability: StateMutability
            inputs: Parameter[]
            outputs: Parameter[]
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
                    topics.push(encodeParameter(input.type, value))
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
                this.definition.anonymous ? topics : topics.slice(1)) as Decoded
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

    export type Decoded = { __length__: number } & { [field: string]: string }
}
