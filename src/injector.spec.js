import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import Injector from './injector';
import Token from './token';
import { DEPENDENCIES, DI_METADATA, PROVIDERS } from './constants';

chai.use(chaiAsPromised);
chai.use(chaiSubset);

describe('Injector', () => {
	describe('provide', () => {
		it('Should accept function as short-hand for providing instance, constructed by this function', () => {
			function Foo() {}
			(() => { new Injector().provide(Foo); }).should.not.throw();
		});

		it('Should accept function as DI token and other function as resolver for it', () => {
			function Foo() {}
			function Bar() {}
			(() => { new Injector().provide(Foo, Bar); }).should.not.throw();
		});

		it('Should not accept instance of token without second argument', () => {
			const token = new Token();
			(() => { new Injector().provide(token); }).should.throw();
		});

		it('Should accept instance of token with resolver function as second parameter', () => {
			const token = new Token();
			function Bar() {}
			(() => { new Injector().provide(token, Bar); }).should.not.throw();
		});

		it('Should add data about provider to list of providers', () => {
			const token = new Token();
			function Bar() {}
			const injector = new Injector();
			injector.provide(token, Bar);
			injector[PROVIDERS].get(token).should.be.deep.equal({ module: Bar });
		});
	});

	describe('provider', () => {
		it('Should provide dependencies for direct instantiating, added to its metadata', async () => {
			const token = new Token();
			function Bar() {}
			function Provider() { this.foo = Bar; }
			Provider.prototype = { [DI_METADATA]: new Map([['foo', { token }]]) };
			const injector = new Injector();
			injector.provider(new Provider());
			injector[PROVIDERS].get(token).should.be.deep.equal({
				module: Bar, singleton: undefined, dependencies: undefined,
			});
		});

		it('Should provide dependencies for using as factories, added to its metadata', async () => {
			const token = new Token();
			function Bar() {}
			function Provider() {}
			Provider.prototype = { foo: Bar, [DI_METADATA]: new Map([['foo', { token }]]) };
			const injector = new Injector();
			injector.provider(new Provider());
			const provider = injector[PROVIDERS].get(token);
			provider.factory.should.be.instanceOf(Function);
		});

		it('Should provide dependencies for using as values, added to its metadata', async () => {
			const token = new Token();
			function Provider() {}
			Provider.prototype = { foo: 'BAR', [DI_METADATA]: new Map([['foo', { token }]]) };
			const injector = new Injector();
			injector.provider(new Provider());
			const provider = injector[PROVIDERS].get(token);
			provider.value.should.be.equal('BAR');
		});
	});

	describe('resolveDependency', () => {
		it('Should throw if provider for dependency is not found', async () => {
			const token = new Token();
			const injector = new Injector();
			await injector.resolveDependency(token).should.be.rejected;
		});

		it('Should return value for dependency, specified as plain value', async () => {
			const token = new Token();
			const injector = new Injector();
			function Foo() { return {}; }
			injector.provide(token, { factory: Foo, singleton: true });
			const resolved = await injector.resolveDependency(token);
			resolved.should.be.instanceOf(Object);
			(await injector.resolveDependency(token)).should.be.equal(resolved);
		});

		it('Should return same object for dependencies, annotated as singletons', async () => {
			const token = new Token();
			const injector = new Injector();
			injector.provide(token, { value: 42 });
			(await injector.resolveDependency(token)).should.be.equal(42);
		});
	});

	describe('resolveDependencies', () => {
		it('Should resolve array of dependencies, provided by {key, token} pair and assign result to object', async () => {
			const token = new Token();
			const token2 = new Token();
			const injector = new Injector();
			injector.provide(token, { value: 'foo' });
			injector.provide(token2, { value: 'bar' });

			(await injector.resolveDependencies([{ token, key: 'FOO' }, { token: token2, key: 'BAR' }]))
				.should.be.deep.equal({ FOO: 'foo', BAR: 'bar' });
		});
	});

	describe('get', () => {
		it('Should return constructed dependency for function registered by .provide()', async () => {
			function Foo() {}
			const injector = new Injector().provide(Foo);
			(await injector.get(Foo)).should.be.instanceOf(Foo);
		});

		it('Should return constructed dependency for function registered by .provide() with resolver', async () => {
			function Foo() {}
			function Bar() {}
			const injector = new Injector().provide(Foo, Bar);
			(await injector.get(Foo)).should.be.instanceOf(Bar);
		});

		it('Should return constructed dependency registered by Token with resolver', async () => {
			const token = new Token();
			function Bar() {}
			const injector = new Injector().provide(token, Bar);
			(await injector.get(token)).should.be.instanceOf(Bar);
		});

		it('Should reject if provided parameter is not a function or Token', async () => {
			await (new Injector().get(true)).should.be.rejected;
			await (new Injector().get('foo')).should.be.rejected;
			await (new Injector().get(123)).should.be.rejected;
			await (new Injector().get(null)).should.be.rejected;
			await (new Injector().get(undefined)).should.be.rejected;
			await (new Injector().get(Symbol('foo'))).should.be.rejected;
			await (new Injector().get({})).should.be.rejected;
		});
	});

	describe('create', () => {
		it('Should construct provided function, using it as a constructor', async () => {
			const injector = new Injector();
			function Foo() {}
			(await injector.create(Foo)).should.be.instanceOf(Foo);
		});

		it('Should construct provided function and pass to constructor object, passed in second argument', done => {
			const injector = new Injector();
			const FOO = Symbol('FOO');
			function Foo(params) { return params[FOO] === 42 ? done() : done(new Error('params have not been passed')); }
			injector.create(Foo, { [FOO]: 42 });
		});

		it('Should construct provided function and pass to constructor object, mixed with resolved dependencies-values', done => {
			const injector = new Injector();
			const FOO = Symbol('FOO');
			const BAR = Symbol('BAR');
			const token = new Token();
			injector.provide(token, { value: BAR });
			function Foo(params) { return (params[FOO] === 42 && params.bar === BAR) ? done() : done(new Error('params have not been passed')); }
			Foo.prototype[DEPENDENCIES] = [{ token, key: 'bar' }];
			injector.create(Foo, { [FOO]: 42 });
		});

		it('Should construct provided function and pass to constructor object, mixed with resolved dependencies-factories', done => {
			const injector = new Injector();
			const FOO = Symbol('FOO');
			const BAR = Symbol('BAR');
			const token = new Token();
			injector.provide(token, { factory: () => BAR });
			function Foo(params) { return (params[FOO] === 42 && params.bar === BAR) ? done() : done(new Error('params have not been passed')); }
			Foo.prototype[DEPENDENCIES] = [{ token, key: 'bar' }];
			injector.create(Foo, { [FOO]: 42 });
		});

		it('Should resolve dependencies of dependencies', done => {
			const injector = new Injector();
			const FOO = Symbol('FOO');
			const token = new Token();
			const token2 = new Token();
			injector.provide(token2, { value: 42 });
			injector.provide(token, { factory: dep => dep + 42, dependencies: [token2] });
			function Foo(params) { return (params[FOO] === 42 && params.bar === 84) ? done() : done(new Error('params have not been passed')); }
			Foo.prototype[DEPENDENCIES] = [{ token, key: 'bar' }];
			injector.create(Foo, { [FOO]: 42 });
		});

		it('Should reject if provided parameter is not a function', async () => {
			await (new Injector().create(true)).should.be.rejected;
			await (new Injector().create('foo')).should.be.rejected;
			await (new Injector().create(123)).should.be.rejected;
			await (new Injector().create(null)).should.be.rejected;
			await (new Injector().create(undefined)).should.be.rejected;
			await (new Injector().create(Symbol('foo'))).should.be.rejected;
			await (new Injector().create({})).should.be.rejected;
		});
	});
});
