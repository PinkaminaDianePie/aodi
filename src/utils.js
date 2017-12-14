// @flow

/**
 * Provides utilities for internal functionality
 * @module Utils
 * @private
 */

/**
 * Annotates provided object by provided symbol and data
 *
 * @private
 * @memberof Utils
 * @param  {Object} target object to annotate
 * @param  {Symbol} symbol symbol by which one data will be stored
 * @param  {*} data any data to be sored by provided symbol
 * @return {undefined}
 */
export function annotate(target: Object, symbol: Symbol, data: any): void {
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

/**
 * Retrieves metadata from object, which stored by provided symbol
 *
 * @private
 * @memberof Utils
 * @param  {Object} target object to retrieve data from
 * @param  {Symbol} symbol symbol by which one data is stored
 * @return {*} data which stored by provided symbol
 */
export function getMetadata(target: Object, symbol: Symbol): ?any {
  if (!target) {
    throw new TypeError('getMetadata can be applied only for class, method or class field');
  }
  // $BugInFlow
  if (typeof symbol !== 'symbol') {
    throw new TypeError('param \'symbol\' name must be a \'symbol\' type!');
  }
  return Reflect.ownKeys(target).includes(symbol)
    ? target[symbol]
    : null;
}

/**
 * Provides iterator which iterates through all inheritance chain to root class
 *
 * @private
 * @memberof Utils
 * @param  {Function} childClass class or function for which one all parents should be retrieved
 * @return {Iterable.<Function>} iterator to inheritance root
 */
export function iterateToInheritanceRoot(childClass: Function) {
  if (typeof childClass !== 'function') {
    throw new TypeError('Target for iterate should be a function');
  }
  function* iterate(target: Function): any {
    const parent = Reflect.getPrototypeOf(target);
    yield target;
    if (typeof target === 'function' && parent && parent.prototype) {
      yield* iterate(parent);
    }
  }
  return iterate(childClass);
}

/**
 * Returns map entry by provided key, if entry is not found - adds new entry to map and after return
 * it
 *
 * @private
 * @memberof Utils
 * @param {Map} map map to search entry in
 * @param {*} key key to search in map
 * @param {*} defaultValue value, which will be assigned to map by key, if such entry was not found
 * @return {*} value in map, located by key
 */
export function ensureMapEntry<K, V>(map: Map<K, V>, key: K, defaultValue: V): V {
  let entry = map.get(key);
  if (!entry) {
    entry = defaultValue;
    map.set(key, defaultValue);
  }
  return entry;
}
