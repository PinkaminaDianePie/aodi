// @flow
import { getMetadata, iterateToInheritanceRoot } from './utils';
import { DEPENDENCIES, DI_METADATA, PROVIDERS } from './constants';
import type { ProvideDescriptor, Injectable, Provider } from './decorator.types';

import Token from './token';

type Tokens = Token<any>[];
type Factory = <T>(any) => Promise<T>;

/**
 * Checks if class or one of its parents has constructor method.
 * @private
 * @param  {Class} target class to check
 * @return {Boolean} true if user definded constructor exists, false if used default constructor
 */
function isConstructorExists(target: Function) {
  return [...iterateToInheritanceRoot(target)].find(el => el.length);
}

/**
 * Retrive provider from injector by its token.
 * @private
 * @param  {Injector} injector injector from which one provider will be retrieved
 * @template T
 * @param  {Token<T>|Function} token token to search by
 * @return {ProvideDescriptor} descriptor with all information about provider
 */
function getProvider(injector, token: Injectable): ProvideDescriptor {
  // $BugInFlow
  const provider: ProvideDescriptor = injector[PROVIDERS].get(token);
  if (typeof provider === 'undefined') {
    throw new Error(`Unable to provide dependency ${String(token)}: provider not found`);
  }
  return provider;
}

/**
 * Resolve dependency by provided factory. If factory has its own dependencies - alse resolves them.
 * @private
 * @param {Injector} injector
 * @param {Function} factory
 * @param {Array.<Token|Function>} dependencies
 * @return resolved dependency
 */
async function resolveFactory<T>(injector, factory: Factory, dependencies: Tokens): Promise<T> {
  const paramsDependencies = await Promise
    .all(dependencies.map(el => injector.resolveDependency(el)));
  return factory(...paramsDependencies);
}

/**
 * Main class, responsible for creating DI container. It purpose to be used at entry point of
 * application and provide dependencies to all classes, constructed inside of container.
 */
class Injector {
  // $BugInFlow
  [PROVIDERS] = new Map();

  /**
   * Register a simple provider, which resolves one dependency for one token. Syntax is similar to
   * Angular framework.
   * @example
   * // resolves to class instance when someone will ask this class as a dependency
   * import { Injector } from 'aodi';
   *
   * class Foo {}
   *
   * const injector = new Injector();
   *
   * injector.provide(Foo);
   *
   * @example
   * // resolves to instance of other class when someone will ask class or token as a dependency.
   * import { Injector, Token } from 'aodi';
   *
   * class Foo {}
   * class Bar {}
   *
   * const MyToken = new Token();
   *
   * const injector = new Injector();
   *
   * injector.provide(Foo, Bar); //provides Bar when someone will ask for Foo
   * injector.provide(MyToken, Bar); //provides Bar when someone will ask for MyToken
   *
   * @example
   * // resolves to data constructed by factory function
   * import { Injector, Token } from 'aodi';
   *
   * const MyToken = new Token();
   *
   * const injector = new Injector();
   *
   * injector.provide(MyToken, { factory: () => 42 }); //provides 42 for MyToken
   *
   * @example
   * // marks factory as singleton, so it will be calculated only once
   * import { Injector, Token } from 'aodi';
   *
   * const MyToken = new Token();
   *
   * const injector = new Injector();
   *
   * injector.provide(MyToken, {
   *   singleton: true,
   *   factory: () => 42
   * });
   *
   * @example
   * // provide dependencies for factory
   * import { Injector, Token } from 'aodi';
   *
   * const MyToken = new Token();
   * const MyOtherToken = new Token();

   * const injector = new Injector();
   *
   * injector.provide(MyToken, { factory: () => 'foo' }); //provides 42 for MyToken
   * injector.provide(MyOtherToken, {
   *   dependencies: [MyToken],
   *   factory: (resolvedToken) => resolvedToken + 'bar';
   * });
   *
   * @example
   * // provide is chainable method
   * import { Injector } from 'aodi';
   *
   * class Foo {}
   * class Bar {}
   *
   * const injector = new Injector();
   *
   * injector
   *   .provide(Foo)
   *   .provide(Bar);
   *
   * @template T
   * @param  {Token<T>|Function} token token for dependency
   * @param  {Provider} [provider] provider which will resolve asked dependency
   * @return {Injector} same injector for chaining purposes
   */
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

  /**
   * Register a complex provider, based on `class`, like in java DI libraries. More details at
   * {@link Provider} section
   *
   * @example
   * // register provider
   * import { Injector, Token, provides } from 'aodi';
   *
   * const MyToken = new Token();

   * const injector = new Injector();
   *
   * class MyProvider {
   *   __strip__@provides foo: MyToken = 'foo'; // MyToken will be resolved to string 'foo';
   * }
   *
   * injector.provider(MyProvider);
   *
   * @see {@link Provider}
   * @param  {Provider} provider class, annotated as provider, which will resolve dependencies
   * @return {Injector} same injector for chaining purposes
   */
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

  /**
   * Return instance of requested dependency. Works same as `injector.get`, but without any params
   * check since it's internal method and all params should be alrteady validated before calling
   * this method.
   * @private
   * @template T
   * @param  {Token<T>|Function} token
   * @see {@link Provider.get}
   */
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

  /**
   * Resolve array of dependencies and return them as key-value pairs `{[token]: resolvedDep}`
   * @private
   * @template T
   * @param  {Token<T>|Function} dependencies
   * @return {Promise.<T>}
   */
  async resolveDependencies(dependencies: any[]): Promise<Object> {
    const resolvedDependencies = await Promise.all(dependencies.map(({ key, token }) => this
      .resolveDependency(token)
      .then(data => ({ [key]: data }))));
    return Object.assign({}, ...resolvedDependencies);
  }

  /**
   * Return instance of requested dependency. Dependency should be provided before using
   * `injector.get()` by calling `injector.provide()` or `injector.provider()`. Dependencies without
   * provider can't be resolved. Should be used only at entry point of application, if possible, all
   * classes inside DI container should ask for dependency by `@inject` annotations. Managing
   * dependencies by yourself inside DI container is an anti-pattern in DI.
   *
   * @example
   * // return resolved dependency
   * import { Injector, Token } from 'aodi';
   *
   * const MyToken = new Token();
   *
   * const injector = new Injector();
   *
   * injector.provide(MyToken, { factory: () => 42 });
   *
   * // you can call code below inside of async function or use promises
   * const foo = await injector.get(MyToken); // foo === 42
   *
   * @template T
   * @param {Token<T>|Function} token
   * @return {Promise.<T>}
   */
  async get<T>(token: Token<T> | Function): Promise<T> {
    if (!Token.isInjectable(token)) {
      throw new Error(`Unable to get dependency: provided token should be a class or instanceof Token but got ${typeof token}`);
    }
    return this.resolveDependency(token);
  }

  /**
   * Create instance of provided class, resolving dependencies for it, but class shouldn't have own
   * provider, like in `injector.get()`. This method can be usefull when you import class
   * dynamically in runtime. You can also use it inside of your factories. As second argument this
   * method receive object with params to class, which will be merged with resolved dependencies.
   *
   * @example
   * // constructing class
   * import { Injector, Token, inject } from 'aodi';
   *
   * const MyToken = new Token();
   *
   * const injector = new Injector();
   *
   * injector.provide(MyToken, { factory: () => 42 });
   *
   * class Foo {
   *   __strip__@inject(MyToken) bar;
   *
   *   constructor({ foo, bar }) {
   *     // foo === 24
   *     // bar === 42
   *   }
   * }
   *
   * // you can call code below inside of async function or use promises
   * const foo = injector.create(Foo, { foo: 24 });
   *
   * @example
   * // using in factories
   * import { Injector, Token, inject } from 'aodi';
   *
   * const ConfigFromDB = new Token();
   *
   * const injector = new Injector();
   *
   * injector.provide(ConfigFromDB, { factory: async () => fetch(/.../) });
   *
   * class AppConfig {
   *   __strip__@inject(ConfigFromDB) configFromDB;
   *
   *   constructor({ configFromDB, ...configFromFile }) {
   *     // configFromDB resolved as a dependency
   *     // configFromFile passed from factory below as a parameter
   *   }
   * }
   *
   * const Config = new Token();
   *
   * injector.provide(Config, { factory: async () => {
   *   const configData = await loadConfigFromFileHere();
   *   return injector.create(AppConfig, configData);
   * }});
   *
   * // you can call code below inside of async function or use promises
   * const config = injector.get(Config);
   *
   * @template T
   * @param {Class} ClassToConstruct class to construct with dependency resolve
   * @param {Object} [additionalParams] object, which will be passed to constructor
   * @return {Promise.<T>} promise, which will be resolved to class instance
   */
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
