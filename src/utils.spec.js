import chai from 'chai';
import chaiSubset from 'chai-subset';
import { annotate, getMetadata, iterateToInheritanceRoot, ensureMapEntry } from './utils';

chai.use(chaiSubset);

describe('Utils', () => {
	describe('annotate', () => {
		it('should add metadata to function via symbol from Reflection\'s registry', () => {
			const FOO = Symbol('FOO');
			const f = (foo, bar) => foo + bar;
			annotate(f, FOO, 'baz');
			f[FOO].should.be.deep.equal('baz');
		});

		it('target should not be empty', () => {
			const FOO = Symbol('FOO');
			(() => {
				annotate(null, FOO, 'baz');
			}).should.throw();
			(() => {
				annotate(undefined, FOO, 'baz');
			}).should.throw();
		});

		it('data should be not be empty', () => {
			const FOO = Symbol('FOO');
			const f = (foo, bar) => foo + bar;
			(() => {
				annotate(f, FOO);
			}).should.throw();
		});
	});

	describe('getMetadata', () => {
		const f = (foo, bar) => foo + bar;
		const FOO = Symbol('FOO');

		before(() => {
			annotate(f, FOO, 'baz');
		});

		it('should return previously attached metadata', () => {
			getMetadata(f, FOO).should.be.deep.equal('baz');
		});

		it('should return metadata only by Symbol()', () => {
			(() => {
				getMetadata(f, 'FOO');
			}).should.throw();
		});

		it('target should not be empty', () => {
			(() => {
				getMetadata(null, FOO);
			}).should.throw();
			(() => {
				annotate(undefined, FOO);
			}).should.throw();
		});
	});

	describe('iterateToInheritanceRoot', () => {
		it('should throw if provided data is not typeof function', () => {
			(() => { iterateToInheritanceRoot(); }).should.throw();
			(() => { iterateToInheritanceRoot(42); }).should.throw();
			(() => { iterateToInheritanceRoot('foo'); }).should.throw();
			(() => { iterateToInheritanceRoot(true); }).should.throw();
			(() => { iterateToInheritanceRoot(null); }).should.throw();
			(() => { iterateToInheritanceRoot({}); }).should.throw();
		});

		it('should return generator which will yield function itself in case of simple functions', () => {
			function Foo() {}
			[...iterateToInheritanceRoot(Foo)].should.be.deep.equal([Foo]);
		});

		it('should return generator which will yield function itself all inheritance chain for inherited functions', () => {
			class Foo {}
			class Bar extends Foo {}
			[...iterateToInheritanceRoot(Bar)].should.be.deep.equal([Bar, Foo]);
		});
	});

	describe('ensureMapEntry', () => {
		it('should return entry by its key', () => {
			const map = new Map([['FOO', 'BAR']]);
			ensureMapEntry(map, 'FOO').should.be.equal('BAR');
		});

		it('should return default object, if entry is not found', () => {
			const map = new Map([['FOO', 'BAR']]);
			ensureMapEntry(map, 'FOOBAR', 42).should.be.equal(42);
		});

		it('should add default object, to map, if entry is not found', () => {
			const map = new Map([['FOO', 'BAR']]);
			ensureMapEntry(map, 'FOOBAR', 42);
			map.get('FOOBAR').should.be.equal(42);
		});
	});
});
