// @flow

class Token<T> {
	static isInjectable(dependency: Token<T> | Function): boolean {
		return typeof dependency === 'function' || dependency instanceof Token;
	}
}

export default Token;
