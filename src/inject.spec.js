import chai from 'chai';
import chaiSubset from 'chai-subset';
import { inject, injectable } from './inject';
import { DEPENDENCIES } from './constants';
import Token from './token';

const should = chai.should();
chai.use(chaiSubset);

describe('@inject', () => {
	it('Should throw if receive not a DI token or function as parameter', () => {
		(() => inject()).should.throw();
		(() => inject('')).should.throw();
		(() => inject(null)).should.throw();
		(() => inject({})).should.throw();
		(() => inject(true)).should.throw();
	});

	it('Should return fuction for applying to class field, if passed DI token or function', () => {
		function Foo() {}
		const token = new Token();
		(() => inject(Foo)).should.instanceOf(Function);
		(() => inject(token)).should.instanceOf(Function);
	});

	describe('Injector function, returned from @inject', () => {
		let token;
		let injectApplicator;

		before(() => {
			token = new Token();
			injectApplicator = inject(token);
		});

		it('should annotate prototype of target by provided dependency and key', () => {
			function Foo() {}
			const KEY = 'bar';
			injectApplicator(Foo.prototype, KEY, {});
			should.exist(Foo.prototype[DEPENDENCIES]);
			Foo.prototype[DEPENDENCIES]
				.find(({ key }) => key === KEY)
				.should.be.deep.equal({ key: KEY, token });
		});

		it('should annotate prototype of target by add dependency and key to existed dependencies', () => {
			const otherToken = new Token();
			function Foo() {}
			const KEY_BAR = 'bar';
			const KEY_BAZ = 'baz';
			inject(otherToken)(Foo.prototype, KEY_BAR, {});
			injectApplicator(Foo.prototype, KEY_BAZ, {});
			should.exist(Foo.prototype[DEPENDENCIES]);
			Foo.prototype[DEPENDENCIES]
				.find(({ key }) => key === KEY_BAR)
				.should.be.deep.equal({ key: KEY_BAR, token });
			Foo.prototype[DEPENDENCIES]
				.find(({ key }) => key === KEY_BAZ)
				.should.be.deep.equal({ key: KEY_BAZ, token: otherToken });
		});
	});
});

describe('@injectable', () => {
	it('Should annotate class as injectable, so it will have DEPENDENCIES Symbol in its prototype', () => {
		function Foo() {}
		injectable(Foo);
		should.exist(Foo.prototype[DEPENDENCIES]);
	});
});
