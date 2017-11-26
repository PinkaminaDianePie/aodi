import chai from 'chai';
import chaiSubset from 'chai-subset';
import { provides, singleton, dependencies, ensureProviderMetadataEntry } from './provider';
import Token from './token';
import { DI_METADATA } from './constants';

const should = chai.should();
chai.use(chaiSubset);

describe('Provider', () => {
	describe('ensureProviderMetadataEntry', () => {
		it('Should add Map with empty entry for metadata in object without it', () => {
			const Foo = {};
			const metadata = ensureProviderMetadataEntry(Foo, 'foo');
			metadata.should.be.deep.equal({});
		});

		it('Should return existing metadata if exists', () => {
			const Foo = {};
			const metadata = ensureProviderMetadataEntry(Foo, 'foo');
			metadata.should.be.deep.equal({});
			ensureProviderMetadataEntry(Foo, 'foo').should.be.equal(metadata);
		});
	});

	describe('@provides', () => {
		it('Should throw if called without params', () => {
			(() => { provides(); }).should.throw();
		});

		it('Should throw if called with params, other than functions or DI tokens', () => {
			(() => { provides(true); }).should.throw();
			(() => { provides('foo'); }).should.throw();
			(() => { provides(123); }).should.throw();
			(() => { provides(null); }).should.throw();
			(() => { provides(undefined); }).should.throw();
			(() => { provides(Symbol('foo')); }).should.throw();
			(() => { provides({}); }).should.throw();
		});

		it('Should return decorator function for passed functions or DI tokens', () => {
			provides(class C {}).should.be.a('function');
			provides(new Token()).should.be.a('function');
		});

		it('Should annotate target by DI_METADATA Symbol and add entry with token and key of method in class', () => {
			const token = new Token();
			const injectApplicator = provides(token);
			function Foo() {}
			const KEY = 'foo';
			injectApplicator(Foo.prototype, KEY, {});
			should.exist(Foo.prototype[DI_METADATA]);
			const meta = Foo.prototype[DI_METADATA];
			(meta instanceof Map).should.be.equal(true);
			should.exist(meta.get('foo'));
			meta.get('foo').token.should.be.equal(token);
		});
	});

	describe('@singleton', () => {
		it('Should annotate target by DI_METADATA Symbol and add entry with singleton flag', () => {
			const token = new Token();
			function Foo() {}
			const KEY = 'foo';
			singleton(Foo.prototype, KEY, {});
			should.exist(Foo.prototype[DI_METADATA]);
			const meta = Foo.prototype[DI_METADATA];
			(meta instanceof Map).should.be.equal(true);
			should.exist(meta.get('foo'));
			should.exist(meta.get('foo').singleton);
			meta.get('foo').singleton.should.be.equal(true);
		});
	});

	describe('@dependencies', () => {
		it('Should throw if called without params', () => {
			(() => { dependencies(); }).should.throw();
		});

		it('Should throw if called with params, other than functions or DI tokens', () => {
			(() => { dependencies(true); }).should.throw();
			(() => { dependencies('foo'); }).should.throw();
			(() => { dependencies(123); }).should.throw();
			(() => { dependencies(null); }).should.throw();
			(() => { dependencies(undefined); }).should.throw();
			(() => { dependencies(Symbol('foo')); }).should.throw();
			(() => { dependencies(Symbol({})); }).should.throw();
		});

		it('Should return decorator function for passed functions or DI tokens', () => {
			dependencies(class Foo {}).should.be.a('function');
			dependencies(new Token()).should.be.a('function');
		});

		it('Should annotate target by DI_METADATA Symbol and add entry with list of dependencies', () => {
			const token = new Token();
			const injectApplicator = dependencies(token);
			function Foo() {}
			const KEY = 'foo';
			injectApplicator(Foo.prototype, KEY, {});
			should.exist(Foo.prototype[DI_METADATA]);
			const meta = Foo.prototype[DI_METADATA];
			(meta instanceof Map).should.be.equal(true);
			should.exist(meta.get('foo'));
			(meta.get('foo').dependencies instanceof Array).should.be.equal(true);
			(meta.get('foo').dependencies.includes(token)).should.be.equal(true);
		});
	});
});
