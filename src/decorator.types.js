// @flow
import Token from './token';

export type DescriptorMethod = {
  value: Function,
  enumerable: boolean,
  configurable: boolean,
  writable: boolean,
}

export type DescriptorProperty = {
  initializer: () => any,
  enumerable: boolean,
  configurable: boolean,
  writable: boolean,
}

export type Descriptor = DescriptorMethod | DescriptorProperty;

export type Decorator<T = Descriptor> = (
  target: Object | Function,
  key: string,
  descriptor: T
) => void | T;

export type Injectable = Token<any> | Function;

export type ProvideDescriptor = {
  dependencies: any[],
  factory?: Function,
  module?: Function,
  singleton: boolean,
  value?: any
}
