import { expect } from 'chai'
import { abi } from '../src'


describe('abi', () => {

    // contract Foo {
    //     function f1(uint a1, string a2) public returns(address r1, bytes r2);
    //     event E1(uint indexed a1, string a2);
    //     event E2(uint indexed a1, string a2) anonymous; 
    // }



    let f1 = new abi.Function({
        "constant": false,
        "inputs": [
            {
                "name": "a1",
                "type": "uint256"
            },
            {
                "name": "a2",
                "type": "string"
            }
        ],
        "name": "f1",
        "outputs": [
            {
                "name": "r1",
                "type": "address"
            },
            {
                "name": "r2",
                "type": "bytes"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    })

    let e1 = new abi.Event({
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "a1",
                "type": "uint256"
            },
            {
                "indexed": false,
                "name": "a2",
                "type": "string"
            }
        ],
        "name": "E1",
        "type": "event"
    })

    let e2 = new abi.Event({
        "anonymous": true,
        "inputs": [
            {
                "indexed": true,
                "name": "a1",
                "type": "uint256"
            },
            {
                "indexed": false,
                "name": "a2",
                "type": "string"
            }
        ],
        "name": "E2",
        "type": "event"
    })

    it('function', () => {
        expect(f1.signature).equal('0x27fcbb2f')
        expect(f1.encode(1, 'foo')).equal('0x27fcbb2f000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000003666f6f0000000000000000000000000000000000000000000000000000000000')
        expect(f1.decode('0x000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000003666f6f0000000000000000000000000000000000000000000000000000000000')).deep.equal({
            0: '0x0000000000000000000000000000000000000001',
            1: '0x666f6f',
            __length__: 2,
            r1: '0x0000000000000000000000000000000000000001',
            r2: '0x666f6f'
        })
    })

    it('event', () => {
        expect(e1.signature).equal('0x47b78f0ec63d97830ace2babb45e6271b15a678528e901a9651e45b65105e6c2')
        expect(e1.decode('0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000003666f6f0000000000000000000000000000000000000000000000000000000000', ['0x47b78f0ec63d97830ace2babb45e6271b15a678528e901a9651e45b65105e6c2', '0x0000000000000000000000000000000000000000000000000000000000000001']))
            .deep.equal({
                "0": "1",
                "1": "foo",
                "a1": "1",
                "a2": "foo",
                "__length__": 2
            })

        expect(e2.decode('0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000003666f6f0000000000000000000000000000000000000000000000000000000000', ['0x0000000000000000000000000000000000000000000000000000000000000001']))
            .deep.equal({
                "0": "1",
                "1": "foo",
                "a1": "1",
                "a2": "foo",
                "__length__": 2
            })
    })

})
