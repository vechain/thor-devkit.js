import { expect } from 'chai'
import { Bloom } from '../src'

describe('bloom', () => {
    it('estimate k', () => {
        expect(Bloom.estimateK(1)).equal(16)
        expect(Bloom.estimateK(100)).equal(14)
        expect(Bloom.estimateK(200)).equal(7)
        expect(Bloom.estimateK(300)).equal(5)
        expect(Bloom.estimateK(400)).equal(4)
        expect(Bloom.estimateK(500)).equal(3)
    })
    it('bloom add', () => {
        const b = new Bloom(14)
        b.add(Buffer.from('hello world', 'utf8'))
        expect(b.bits.toString('hex')).equal('00000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000004000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000001000000000000020000000000000000000000000008000000000000000000000000000000080000000100000000000000000000040020000000000080000000000000000000080000000000000000000000000')
    })
    it('bloom test', () => {
        const b = new Bloom(14)
        for (let i = 0; i < 100; i++) {
            b.add(Buffer.from(i + '', 'utf8'))
        }

        for (let i = 0; i < 100; i++) {
            expect(b.test(Buffer.from(i + '', 'utf8'))).equal(true)
        }
    })
})
