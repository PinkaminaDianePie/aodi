// @flow

export function annotate(target: Object, symbol: Symbol, data: any) {
	if (!target) {
		throw new TypeError('annotate can be applied only for class, method or class field');
	}
	if (!data) {
		throw new Error('unable to annotate target: there is no data for annotation provided');
	}
	Reflect.defineProperty(target, symbol, {
		configurable: true,
		writable: false,
		enumerable: true,
		value: data,
	});
}

export function getMetadata(target: Object, symbol: Symbol): ?any {
	if (!target) {
		throw new TypeError('getMetadata can be applied only for class, method or class field');
	}
	if (typeof symbol !== 'symbol') {
		throw new TypeError('param \'symbol\' name must be a \'symbol\' type!');
	}
	return target.hasOwnProperty(symbol)
		? target[symbol]
		: null;
}

export function iterateToInheritanceRoot(childClass: Function) {
	if (typeof childClass !== 'function') {
		throw new TypeError('Target for iterate should be a function');
	}
	// eslint-disable-next-line no-undef
	function* iterate(target: Function): Generator<Function, void, void> {
		const parent = Reflect.getPrototypeOf(target);
		yield target;
		if (typeof target === 'function' && parent && parent.prototype) {
			yield* iterate(parent);
		}
	}
	return iterate(childClass);
}

export function ensureMapEntry<K, V>(map: Map<K, V>, key: K, defaultValue: V): V {
	let entry = map.get(key);
	if (!entry) {
		entry = defaultValue;
		map.set(key, defaultValue);
	}
	return entry;
}
