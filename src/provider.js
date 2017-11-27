// @flow
import { getMetadata, annotate, ensureMapEntry } from './utils';
import { DI_METADATA } from './constants';
import type { Descriptor, DescriptorMethod, Decorator, Injectable } from './decorator.types';
import Token from './token';

/**
 * Returnes metadata from provider's prototype located by DI_METADATA Symbol, if such metadata does
 * not exists - creates it and return after that.
 * @private
 * @param  {Object} providerPrototype prototype of provider, where metadata is located
 * @return {Map<string, Object>} existed or created metadata entry
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
 * Annotates provider to be responsible for provide passed DI token. After that DI system will know
 * that this method should be called when any module will ask dependency, associated with this DI
 * token.
 * @param  {Token|Function} token token to be provided by method
 * @return {Decorator} decorator function which can be applied to method or field only
 */
export function provides(token: Injectable): Decorator<Descriptor> {
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
 * @param  {...Function|Object} dependenciesList dependencies to inject
 * @return {Decorator} decorator function which can be applied to method only
 */
export function dependencies(...dependenciesList: Array<Injectable>): Decorator<DescriptorMethod> {
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
