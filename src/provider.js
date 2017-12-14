// @flow
import { getMetadata, annotate, ensureMapEntry } from './utils';
import { DI_METADATA } from './constants';
import type { Descriptor, DescriptorMethod, Decorator, DecoratorMethod, Injectable } from './decorator.types';
import Token from './token';

/**
 * Provides utilities for injecting dependencies and performing IoC
 * @module Provider
 */

/**
 * Returnes metadata from provider's prototype located by DI_METADATA Symbol, if such metadata does
 * not exists - creates it and return after that.
 * @private
 * @memberof Provider
 * @param  {Object} providerPrototype prototype of provider, where metadata is located
 * @return {Map.<string, Object>} existed or created metadata entry
 */
export function ensureProviderMetadataEntry(providerPrototype: Object, key: string) {
  let metadata = getMetadata(providerPrototype, DI_METADATA);
  if (!metadata) {
    metadata = new Map();
    annotate(providerPrototype, DI_METADATA, metadata);
  }
  const entry = ensureMapEntry(metadata, key, {});
  return entry;
}

/**
 * Annotates provider to be responsible for provide dependency for passed DI token. After that DI
 * system will know that this method should be called when any module will ask dependency,
 * associated with this token. It is also possible to annotate class field, in that case value of
 * field will be used as resolved dependency. You can choose any name for method/field, DI does not
 * use it, only annotations and value are important.
 *
 * @example
 * // you can provide both value as class field or return it from factory method
 * import { Injector, Token, provides } from 'aodi';
 *
 * const MyToken = new Token();
 * const MyOtherToken = new Token();
 *
 * const injector = new Injector();
 *
 * class MyProvider {
 *   __strip__@provides(MyToken)
 *   foo = 'foo';
 *
 *   __strip__@provides(MyOtherToken)
 *   bar() {
 *     return 'bar';
 *   }
 * }
 *
 * // you can call code below inside of async function or use promises
 * const myToken = injector.get(MyToken); // 'foo'
 * const myOtherToken = injector.get(MyOtherToken); // 'bar'
 *
 * @memberof Provider
 * @template T
 * @param  {Token<T>|Function} token token to be provided by method
 * @return {Decorator} decorator function which can be applied to method or field only
 */
export function provides(token: Injectable): Decorator {
  if (!Token.isInjectable(token)) {
    throw new Error(`Unable to provide dependency ${String(token)}, it should be a class or instanceof Token.`);
  }
  return function providesApplicator(
    target: Object,
    key: string,
    descriptor: Descriptor,
  ): Descriptor {
    const entry = ensureProviderMetadataEntry(target, key);
    entry.token = token;
    return descriptor;
  };
}

/**
 * Annotates provider method as a singleton. Annotated method will be called only once, returned
 * value will be cached and returned on all further method calls.
 *
 * @example
 * // you can see that singleton returns same data every time
 * import { Injector, Token, provides, singleton } from 'aodi';
 *
 * const MyToken = new Token();
 *
 * const injector = new Injector();
 *
 * class MyProvider {
 *   __strip__@provides(MyToken)
 *   __strip__@singleton
 *   foo() {
 *     return Symbol('foo');
 *   }
 * }
 *
 * injector.provider(MyProvider);
 *
 * // you can call code below inside of async function or use promises
 * await injector.get(MyToken) === await injector.get(MyToken) // true
 *
 * @memberof Provider
 * @return {DescriptorMethod}  decorated method descriptor
 */
export function singleton(
  target: Object,
  key: string,
  descriptor: DescriptorMethod,
): DescriptorMethod {
  const entry = ensureProviderMetadataEntry(target, key);
  entry.singleton = true;
  return descriptor;
}

/**
 * Annotates provider method with dependencies list. When this method will be invoked, dependencies
 * list will be resolved by DI mechanism and passed as method parameters.
 *
 * @example
 * // you can see that singleton returns same data every time
 * import { Injector, Token, provides, dependencies } from 'aodi';
 *
 * const MyToken = new Token();
 * const MyOtherToken = new Token();
 *
 * const injector = new Injector();
 *
 * class MyProvider {
 *   __strip__@provides(MyOtherToken)
 *   foo = 'foo';
 *
 *   __strip__@provides(MyToken)
 *   __strip__@dependencies(MyOtherToken)
 *   bar(otherToken) {
 *     return otherToken + 'bar';
 *   }
 * }
 *
 * injector.provider(MyProvider);
 *
 * // you can call code below inside of async function or use promises
 * const myToken = await injector.get(MyToken); // 'foobar';
 *
 * @memberof Provider
 * @param  {...Token} dependenciesList dependencies to inject
 * @return {Function} decorator function which can be applied to method only
 */
export function dependencies(...dependenciesList: Array<Injectable>): DecoratorMethod {
  if (!dependenciesList.length) {
    throw new Error('Dependencies list for @dependencies decorator should not be empty');
  }
  const invalidIndex = dependenciesList.findIndex(dependency => !Token.isInjectable(dependency));
  if (invalidIndex !== -1) {
    const invalidDependency = dependenciesList[invalidIndex];
    throw new Error(`Dependency must be a injection token or class, but typeof ${String(invalidDependency)} is ${typeof invalidDependency}`);
  }
  return function dependenciesApplicator(
    target: Object,
    key: string,
    descriptor: DescriptorMethod,
  ): DescriptorMethod {
    const entry = ensureProviderMetadataEntry(target, key);
    entry.dependencies = dependenciesList;
    return descriptor;
  };
}
