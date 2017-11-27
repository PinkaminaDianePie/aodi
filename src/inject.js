// @flow
import { annotate, getMetadata } from './utils';
import { DEPENDENCIES } from './constants';
import type { DescriptorProperty, Decorator, Injectable } from './decorator.types';
import Token from './token';

/**
 * Add DI metadata to class. If parent class also have some dependencies - they are also copied
 * to child, so DI will have full list of dependencies in one place.
 * @private
 * @param  {Object} target prototype of class to annotate
 * @return {Object} annotated prototype
 */
function ensureMetadata(target: Object): Object[] {
  const metadata: ?Object[] = getMetadata(target, DEPENDENCIES);
  if (!metadata) {
    const Parent = Reflect.getPrototypeOf(target);
    const parentMetadata = getMetadata(Parent, DEPENDENCIES) || [];
    annotate(target, DEPENDENCIES, parentMetadata);
    return parentMetadata;
  }
  return metadata;
}

/**
 * Marks property as injectable. This property will be resolved by DI system and injected on
 * instantiating of this class. It will be passed to class constructor as part of key:value oject
 * in first param, so it can be used in constructor. Params for parent class are also included. If
 * class has no constructor at all - resolved dependency will be assigned to class instance by
 * Object.assign().
 * @memberof DependencyInjection
 * @param  {Token|class} dependency dependency which will be injected to annotated field
 * @return {Function} decorator to annotate class field
 */
export function inject(dependency: Injectable): Decorator<DescriptorProperty> {
  if (!Token.isInjectable(dependency)) {
    throw new Error(`Unable to inject dependency ${String(dependency)}, it should be a class or instanceof Token.`);
  }
  return function injectApplicator(
    target: Object,
    key: string,
    descriptor: DescriptorProperty,
  ): DescriptorProperty {
    const dependencies = ensureMetadata(target);
    annotate(target, DEPENDENCIES, [...dependencies, { key, token: dependency }]);
    return { ...descriptor, writable: true };
  };
}

/**
 * Marks class a injectable. If class use @inject decorators it will be annotated automatically, so
 * it's only mandatory to mark child classes without any @inject to be able to be able to use
 * dependencies provided by parent, but you can mark all classes which uses DI just to be sure.
 * @param  {Class} target class to annotate
 * @return {Class} annotated class
 */
export function injectable(target: Function): Function {
  ensureMetadata(target.prototype);
  return target;
}
