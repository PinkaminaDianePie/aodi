import chai from 'chai';
import chaiSubset from 'chai-subset';
import Token from './token';

chai.use(chaiSubset);

describe('Token', () => {
	describe('static isInjectable', () => {
		it('Should return false if provided data is not a function or instanceof Token', () => {
			(Token.isInjectable()).should.be.equal(false);
			(Token.isInjectable('')).should.be.equal(false);
			(Token.isInjectable(null)).should.be.equal(false);
			(Token.isInjectable({})).should.be.equal(false);
			(Token.isInjectable(true)).should.be.equal(false);
		});
		it('Should return false if provided data is a function or instanceof Token', () => {
			function Foo() {}
			const token = new Token();
			(Token.isInjectable(Foo)).should.be.equal(true);
			(Token.isInjectable(token)).should.be.equal(true);
		});
	});
});
