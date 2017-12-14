// @flow

/**
 * Class-placeholder, used to bound injectable parameter with some resolvers. It can be used to
 * provide non-class dependencies like numbers or plain objects for example, but it still usefull
 * for classes, which implements same interface, but not inherited from any common base class.
 *
 * @example
 * // ES6+ way
 * import { Token } from 'aodi';
 *
 * const MyDependencyToken = new Token();
 *
 * @example
 * // flow way
 * import { Token } from 'aodi';
 *
 * interface MyDependency {}
 *
 * // providing interface helps flow to understand to which dependency this token will be resolved
 * const MyDependencyToken<MyDependency> = new Token();
 */
class Token<T> {
  /**
   * Return true, if provided dependency is injectable (it should be instance of Token or function),
   * otherwise it returns falls
   * @private
   * @return {boolean}
   */
  static isInjectable(dependency: Token<T> | Function): boolean {
    return typeof dependency === 'function' || dependency instanceof Token;
  }
}

export default Token;
