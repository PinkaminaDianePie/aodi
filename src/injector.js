// @flow
import { getMetadata, iterateToInheritanceRoot } from './utils';
import { DEPENDENCIES, DI_METADATA, PROVIDERS } from './constants';

import Token from './token';

type Provider = Function | (({
	value: any;
} | {
	module : Function;
	singleton?: boolean;
} | {
	factory: Function;
	dependencies?: any[];
	singleton?: boolean;
}));

function isConstructorExists(target: Function) {
	return [...iterateToInheritanceRoot(target)].find(el => el.length);
}

class Injector {
	[PROVIDERS] = new Map();

	provide<T>(token: Token<T> | Function, provider?: Provider): Injector {
		let providerData = provider;
		if (typeof provider === 'function') {
			providerData = { module: provider };
		} else if (typeof provider === 'undefined') {
			if (token instanceof Token) {
				throw new Error('Can\'t provide injection token without specifying any resolvers in second parameter');
			}
			providerData = { module: token };
		}
		// TODO: check all possible params
		this[PROVIDERS].set(token, providerData);
		return this;
	}

	provider(provider: Object): Injector {
		const proto = Reflect.getPrototypeOf(provider);
		for (const [key, { token, dependencies, singleton }] of getMetadata(proto, DI_METADATA).entries()) {
			if (typeof provider[key] === 'function') {
				if (typeof proto[key] === 'function') {
					this.provide(token, {
						dependencies,
						factory: provider[key].bind(provider),
						singleton,
					});
				} else {
					this.provide(token, {
						dependencies,
						module: provider[key],
						singleton,
					});
				}
			} else {
				this.provide(token, {
					dependencies,
					value: provider[key],
					singleton,
				});
			}
		}
		return this;
	}

	async resolveDependencies(dependencies): Promise<Object> {
		const resolvedDependencies = await Promise.all(dependencies.map(({ key, token }) => this
			.resolveDependency(token)
			.then(data => ({ [key]: data }))));
		return Object.assign({}, ...resolvedDependencies);
	}

	async resolveDependency<T>(token: Token<T> | Function) {
		const provider = this[PROVIDERS].get(token);
		if (typeof provider === 'undefined') {
			throw new Error(`Unable to provide dependency ${String(token)}: provider not found`);
		}
		let {
			dependencies = [],
			value,
			factory,
			module,
			singleton,
		} = provider;
		if (typeof value !== 'undefined') {
			return value;
		}
		let resolvedDependency: T;
		if (typeof factory === 'function') {
			const paramsDependencies = await Promise.all(dependencies.map(el => this.resolveDependency(el)));
			resolvedDependency = factory(...paramsDependencies);
		} else {
			resolvedDependency = await this.create(module);
		}
		if (singleton) {
			value = resolvedDependency;
			this[PROVIDERS].set(token, {
				dependencies,
				value,
				factory,
				module,
				singleton,
			});
		}
		return resolvedDependency;
	}

	async get<T>(token: Token<T> | Function): Promise<T> {
		if (!Token.isInjectable(token)) {
			throw new Error(`Unable to get dependency: provided token should be a class or instanceof Token but got ${typeof token}`);
		}
		return this.resolveDependency(token);
	}

	async create<T>(ClassToConstruct: Function, additionalParams?: Object): Promise<T> {
		if (typeof ClassToConstruct !== 'function') {
			throw new Error(`Unable to construct dependency: parameter should be a class but got ${typeof ClassToConstruct}`);
		}
		const dependencies = getMetadata(ClassToConstruct.prototype, DEPENDENCIES);
		let resolvedDependencies = {};
		if (dependencies) {
			resolvedDependencies = await this.resolveDependencies(dependencies);
		}
		if (additionalParams) {
			resolvedDependencies = Object.assign(resolvedDependencies, additionalParams);
		}

		const instance: T = Reflect.construct(ClassToConstruct, [resolvedDependencies]);
		if (!isConstructorExists(ClassToConstruct)) {
			Object.assign(instance, resolvedDependencies);
		}
		return instance;
	}
}

export default Injector;
