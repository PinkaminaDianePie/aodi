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

export type Decorator = (
  target: Object | Function,
  key: string,
  descriptor: DescriptorMethod | DescriptorProperty
) => void | DescriptorMethod | DescriptorProperty;

export type DecoratorMethod = (
  target: Object | Function,
  key: string,
  descriptor: DescriptorMethod
) => void | DescriptorMethod;

export type DecoratorProperty = (
  target: Object | Function,
  key: string,
  descriptor: DescriptorProperty
) => void | DescriptorProperty;

export type Injectable = Token<any> | Function;

export type Provider = Function | (({
  value: any;
} | {
  module : Function;
  singleton?: boolean;
} | {
  factory: Function;
  dependencies?: any[];
  singleton?: boolean;
}));

export type ProvideDescriptor = {
  dependencies: any[],
  factory?: Function,
  module?: Function,
  singleton: boolean,
  value?: any
}
