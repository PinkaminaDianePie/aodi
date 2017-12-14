// @flow
import { annotate, getMetadata } from './utils';
import { DEPENDENCIES } from './constants';
import type { DescriptorProperty, DecoratorProperty, Injectable } from './decorator.types';
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
 *
 * @example
 * // ES6+ way
 * import { inject, Token } from 'aodi';
 *
 * const MyDependencyToken = new Token();
 * class C{
 *   __strip__@inject(MyDependencyToken) foo;
 * }
 *
 * @example
 * // Flow way
 * import { inject, Token } from 'aodi';
 *
 * interface Dep {};
 *
 * const MyDependencyToken: Token<Dep> = new Token();
 * class C{
 *   __strip__@inject(MyDependencyToken) foo: Dep;
 * }
 *
 * @example
 * // Example of usage in constructor
 * import { inject, Token } from 'aodi';
 *
 * const MyDependencyToken = new Token();
 * class C{
 *   __strip__@inject(MyDependencyToken) foo;
 *   constructor({ foo }) {
 *     // foo is available as a property of params object.
 *   }
 * }
 *
 * @memberof DependencyInjection
 * @template T
 * @param  {Token<T>|Function} dependency dependency which will be injected to annotated field
 * @return {Function} decorator to annotate class field
 */
export function inject(dependency: Injectable): DecoratorProperty {
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
 * it's only mandatory to mark child classes without any @inject to be able to use dependencies
 * provided by parent. You can still mark all classes which uses DI for consistency.
 *
 * @example
 * import { injectable, inject, Token } from 'aodi';
 *
 * const MyDependencyToken = new Token();
 * __strip__@injectable //not necessary here, because we already used @inject
 * class C{
 *   __strip__@inject(MyDependencyToken) foo;
 * }
 *
 * @example
 * import { injectable, inject, Token } from 'aodi';
 *
 * const MyDependencyToken = new Token();
 * class Foo {
 *   __strip__@inject(MyDependencyToken) foo;
 * }
 *
 * __strip__@injectable //necessary, DI should know about parent's params before instantiating Foo
 * class Bar extends Foo {
 *   bar() {
 *     this.foo; //it will be available in child because parent asked this dependency
 *   }
 * }
 *
 * @memberof DependencyInjection
 * @param  {Class} target class to annotate
 * @return {Class} annotated class
 */
export function injectable(target: Function): Function {
  ensureMetadata(target.prototype);
  return target;
}
