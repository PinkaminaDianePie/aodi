// @flow
import { getMetadata, iterateToInheritanceRoot } from './utils';
import { DEPENDENCIES, DI_METADATA, PROVIDERS } from './constants';
import type { ProvideDescriptor, Injectable, Provider } from './decorator.types';

import Token from './token';

function isConstructorExists(target: Function) {
  return [...iterateToInheritanceRoot(target)].find(el => el.length);
}

function getProvider(injector, token): ProvideDescriptor {
  // $BugInFlow
  const provider = injector[PROVIDERS].get(token);
  if (typeof provider === 'undefined') {
    throw new Error(`Unable to provide dependency ${String(token)}: provider not found`);
  }
  return provider;
}

async function resolveFactory(injector, factory, dependencies) {
  const paramsDependencies = await Promise
    .all(dependencies.map(el => injector.resolveDependency(el)));
  return factory(...paramsDependencies);
}

class Injector {
  // $BugInFlow
  [PROVIDERS] = new Map();

  provide(token: Injectable, provider?: Provider): Injector {
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
    // $BugInFlow
    this[PROVIDERS].set(token, providerData);
    return this;
  }

  provider(provider: Object): Injector {
    const proto = Reflect.getPrototypeOf(provider);
    const metadata = getMetadata(proto, DI_METADATA);
    if (!metadata) {
      throw new Error('Provided object is not a valid provider');
    }
    [...metadata.entries()].map(([key, { token, dependencies, singleton }]) => {
      const result: ProvideDescriptor = { dependencies, singleton };
      if (typeof provider[key] !== 'function') {
        result.value = provider[key];
      } else if (typeof proto[key] === 'function') {
        result.factory = provider[key].bind(provider);
      } else {
        result.module = provider[key];
      }
      return [token, result];
    }).forEach(([token, payload]) => this.provide(token, payload));
    return this;
  }

  async resolveDependencies(dependencies: any[]): Promise<Object> {
    const resolvedDependencies = await Promise.all(dependencies.map(({ key, token }) => this
      .resolveDependency(token)
      .then(data => ({ [key]: data }))));
    return Object.assign({}, ...resolvedDependencies);
  }

  async resolveDependency<T>(token: Token<T> | Function): Promise<T> {
    const provider = getProvider(this, token);
    const {
      dependencies = [],
      factory,
      module,
      singleton,
      value,
    } = provider;
    if (typeof value !== 'undefined') {
      return value;
    }
    let resolvedDependency: T;
    if (typeof factory !== 'undefined') {
      resolvedDependency = await resolveFactory(this, factory, dependencies);
    }
    if (typeof module !== 'undefined') {
      resolvedDependency = await this.create(module);
    }
    if (singleton) {
      provider.value = resolvedDependency;
    }
    // $BugInFlow
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
