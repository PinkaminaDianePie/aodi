// @flow
/**
 * Provides utilities for injecting dependencies and performing IoC
 * @module DependencyInjection
 */
export { inject, injectable } from './lib/inject';
export { default as Token } from './lib/token';
export { default as Injector } from './lib/injector';
export { provides, singleton, dependencies } from './lib/provider';
export { DEPENDENCIES, DI_METADATA, PROVIDERS } from './lib/constants';
