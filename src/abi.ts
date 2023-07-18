// @ts-nocheck
import { formatSignature as _formatSignature } from '@vechain/ethers/utils/abi-coder'
import { keccak256 } from './keccak'
import { Buffer } from 'buffer'
import { ethers } from 'ethers'
import * as web3 from 'web3'

// Ethers coder instance
const ethersCoder = new ethers.AbiCoder()

function formatSignature(fragment: any) {
    try {
        return _formatSignature(fragment)
            .replace(/\(tuple\(/g, '((')
            .replace(/\,tuple\(/g, ',(')
    } catch (err) {
        if (err.reason) {
            throw new Error(err.reason)
        }
        throw err
    }
}

/** encode/decode parameters of contract function call, event log, according to ABI JSON */
export namespace abi {

    /**
     * encode single parameter
     * @param type type of the parameter
     * @param value value of the parameter
     * @returns encoded value in hex string
     */
    export function encodeParameter(type: string, value: any) {
        const encoded = ethersCoder.encode([type], [value])

        return encoded
    }

    /**
     * decode single parameter
     * @param type type of the parameter
     * @param data encoded parameter in hex string
     * @returns decoded value
     */
    export function decodeParameter(type: string, data: string) {
        const decoded = ethersCoder.decode([type], data).values().next().value.toString()

        return decoded
    }

    /**
     * encode a group of parameters
     * @param types type array
     * @param values value array
     * @returns encoded values in hex string
     */
    export function encodeParameters(types: Function.Parameter[], values: any[]) {
        const encode = web3.eth.abi.encodeParameters(types, values)
        return encode
    }

    /**
     * decode a group of parameters
     * @param types type array
     * @param data encoded values in hex string
     * @returns decoded object
     */
    export function decodeParameters(types: Function.Parameter[], data: string) {
        // 1 - Decode parameters
        var decodedParameters = web3.eth.abi.decodeParameters(types, data)

        // 2 - Remove __length__ property
        delete decodedParameters['__length__']

        // 3 - Get final result
        const decoded: Decoded = {}
        types.forEach((t, i) => {
            decoded[i] = decodedParameters[i]
            if (t.name) {
                decoded[t.name] = decodedParameters[i]
            }
        })

        return decoded
    }

    /** for contract function */
    export class Function {
        /** canonical name */
        public readonly canonicalName: string

        /** the function signature, aka. 4 bytes prefix */
        public readonly signature: string

        /**
         * create a function object
         * @param definition abi definition of the function
         */
        constructor(public readonly definition: Function.Definition) {
            this.canonicalName = formatSignature(definition)
            this.signature = '0x' + keccak256(this.canonicalName).slice(0, 4).toString('hex')
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
            components?: any[] // Tuples ONLY
            internalType?: string
        }

        export interface Definition {
            type: 'function'
            name: string
            constant?: boolean
            payable?: boolean
            stateMutability: StateMutability
            inputs: Parameter[]
            outputs: Parameter[]
        }
    }

    /** for contract event */
    export class Event {
        /** canonical name */
        public readonly canonicalName: string

        /** the event signature */
        public readonly signature: string

        /** for contract event */
        constructor(public readonly definition: Event.Definition) {
            this.canonicalName = formatSignature(definition)
            this.signature = '0x' + keccak256(this.canonicalName).toString('hex')
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
                    let topic
                    // https://docs.soliditylang.org/en/v0.8.11/abi-spec.html#encoding-of-indexed-event-parameters
                    if (isValueType(input.type)) {
                        topic = encodeParameter(input.type, value)
                    } else {
                        if (input.type === 'string') {
                            topic = '0x' + keccak256(value).toString('hex')
                        } else if (typeof value === 'string' && /^0x[0-9a-f]+$/i.test(value) && value.length % 2 === 0) {
                            // value is encoded
                            topic = '0x' + keccak256(Buffer.from(value.slice(2), 'hex')).toString('hex')
                        } else {
                            throw new Error(`event.encode: invalid ${input.type} value`)
                        }
                    }
                    topics.push(topic)
                }
            }
            return topics
        }

        /**
         * Get indexed elements of decoded object.
         * Indexed elements are elements with keys like '0', '1', '2', etc.
         * 
         * @param decoded Decoded object from decodeParameters function
         * 
         * @returns Array of indexed elements [[[], [], ...]]]
         */
        private getIndexedElementOfDecoded(decoded: Array<Decoded>) {
            // Base case - Empty object
            if (Object.keys(decoded).length === 0) return []

            // Normal cases - Non-empty object
            var values: Array<any> = []

            Object.keys(decoded).forEach(key => {
                // Keys like '0': ..., '1': ..., '2': ..., etc.
                if (key.match(/^\d+$/)) {
                    values.push(decoded[key])
                }
            })

            return values
        }

        /**
         * decode event log
         * @param data data in event output
         * @param topics topics in event
         */
        public decode(data: string, topics: string[]) {
            if (!this.definition.anonymous) {
                topics = topics.slice(1)
            }

            if (this.definition.inputs.filter(t => t.indexed).length !== topics.length) {
                throw new Error('invalid topics count')
            }

            const nonIndexedInput = this.definition.inputs.filter(t => !t.indexed)
            const decodedIndexed = this.getIndexedElementOfDecoded(decodeParameters(nonIndexedInput, data))

            const decoded: Decoded = {}
            this.definition.inputs.forEach((t, i) => {
                if (t.indexed) {
                    const topic = topics.shift()!
                    decoded[i] = isValueType(t.type) ? decodeParameter(t.type, topic) : topic
                } else {
                    decoded[i] = decodedIndexed.shift()
                }
                if (t.name) {
                    decoded[t.name] = decoded[i]
                }
            })
            return decoded
        }
    }

    export namespace Event {
        export interface Parameter {
            name: string
            type: string
            indexed: boolean
            components?: any[] // Tuples ONLY
            internalType?: string
        }

        export interface Definition {
            type: 'event'
            name: string
            anonymous?: boolean
            inputs: Parameter[]
        }
    }

    export type Decoded = { [name: string]: any } & { [index: number]: any }

    function isValueType(type: string) {
        return type === 'address' || type === 'bool' || /^(u?int)([0-9]*)$/.test(type) || /^bytes([0-9]+)$/.test(type)
    }
}
