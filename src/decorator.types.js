// @flow
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

export type Decorator<T = Descriptor> = (target: Object | Function, key: string, descriptor: T) => void | T;
