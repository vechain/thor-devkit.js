# Thor DevKit

Typescript library to aid DApp development on VeChain Thor

[![Gitter](https://badges.gitter.im/vechain/thor.svg)](https://gitter.im/vechain/thor?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

[![NPM Version](https://badge.fury.io/js/thor-devkit.svg)](https://www.npmjs.com/package/thor-devkit)
[![Build Status](https://travis-ci.org/vechain/thor-devkit.js.svg)](https://travis-ci.org/vechain/thor-devkit.js)
[![Coverage Status](https://coveralls.io/repos/github/vechain/thor-devkit.js/badge.svg?branch=master)](https://coveralls.io/github/vechain/thor-devkit.js?branch=master)

## Installation

```bash
npm i --save thor-devkit
```

## Usage

import all components or some of them

```javascript
import {
    cry,
    abi,
    RLP,
    Transaction
} from 'thor-devkit'
```

### Crypto methods

they are under `cry` namespace

#### Hashing

```javascript
let hash = cry.blake2b256('hello world')
console.log(hash.toString('hex'))
// 256c83b297114d201b30179f3f0ef0cace9783622da5974326b436178aeef610

hash = cry.keccak256('hello world')
console.log(hash.toString('hex'))
// 47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad
```

#### Secp256k1

```javascript
let privKey = cry.secp256k1.generatePrivateKey()
let pubKey = cry.secp256k1.derivePublicKey(privKey)
let addr = cry.publicKeyToAddress(pubKey)
let signature = cry.secp256k1.sign(cry.keccak256('hello world'), privKey)
let recoveredPubKey = cry.secp256k1.recover(cry.keccak256('hello world'), signature)
```

#### Mnemonic & Keystore

```javascript
// generate BIP39 mnemonic words, default to 12 words(128bit strength)
let words = cry.mnemonic.generate()

// derive private key from mnemonic words according to BIP32, using the path `m/44'/818'/0'/0`.
// defined for VET at https://github.com/satoshilabs/slips/blob/master/slip-0044.md
let privateKey = cry.mnemonic.derivePrivateKey(words)

// in recovery process, validation is recommended
let ok = cry.mnemonic.validate(words)

// encrypt/decrypt private key using Ethereum's keystore scheme
let keystore = await cry.Keystore.encrypt(privateKey, 'your password')

// throw for wrong password
let recoveredPrivateKey = await cry.Keystore.decrypt(keystore, 'your password')

// roughly check keystore format
ok = cry.Keystore.wellFormed(keystore)
```

### RLP

```javascript
// define the profile for tx clause structure
let profile: RLP.Profile = {
    name: 'clause',
    kind: [
        { name: 'to', kind: new RLP.NullableFixedBlobKind(20) },
        { name: 'value', kind: new RLP.NumericKind(32) },
        { name: 'data', kind: new RLP.BlobKind() }
    ]
}

let clause = {
    to: '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed',
    value: 10,
    data: '0x'
}

let rlp = new RLP(profile)

let data = rlp.encode(clause)
console.log(data.toString('hex'))
// d7947567d83b7b8d80addcb281a71d54fc7b3364ffed0a80

let obj = rlp.decode(data)
// `obj` should be identical to `clause`
```

### Transaction

```javascript
let clauses =  [{
    to: '0x7567d83b7b8d80addcb281a71d54fc7b3364ffed',
    value: 10000,
    data: '0x'
}]

// calc intrinsic gas
let gas = Transaction.intrinsicGas(clauses)
console.log(gas)
// 21000

let body: Transaction.Body = {
    chainTag: 0x9a,
    blockRef: '0x0000000000000000',
    expiration: 32,
    clauses: clauses,
    gasPriceCoef: 128,
    gas: 21000,
    dependsOn: null,
    nonce: 12345678
}

let tx = new Transaction(body)
let signingHash = cry.blake2b256(tx.encode())
tx.signature = cry.secp256k1.sign(signingHash, /* your private key */)

let raw = tx.encode()
let decoded = Transaction.decode(raw)
```

### ABI

```javascript
let fn = new abi.Function({
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

let data = fn.encode(1, 'foo')
```

## License

thor-devkit is licensed under the
[GNU Lesser General Public License v3.0](https://www.gnu.org/licenses/lgpl-3.0.html), also included
in *LICENSE* file in repository.
