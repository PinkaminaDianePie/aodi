# AODI - Another one Dependency Injection
[![Build Status](https://travis-ci.org/PinkaminaDianePie/aodi.svg?branch=master)](https://travis-ci.org/PinkaminaDianePie/aodi)
[![Coverage Status](https://coveralls.io/repos/github/PinkaminaDianePie/aodi/badge.svg)](https://coveralls.io/github/PinkaminaDianePie/aodi)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/00a69dc82a8343db8e7fcf3d8d4bd01e)](https://www.codacy.com/app/PinkaminaDianePie/aodi?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=PinkaminaDianePie/aodi&amp;utm_campaign=Badge_Grade)
[![Maintainability](https://api.codeclimate.com/v1/badges/0887c585a0337f498016/maintainability)](https://codeclimate.com/github/PinkaminaDianePie/aodi/maintainability)
[![codebeat badge](https://codebeat.co/badges/79f4cc62-2145-4816-87ec-59631cc98533)](https://codebeat.co/projects/github-com-pinkaminadianepie-aodi-master)
[![devDependencies Status](https://david-dm.org/PinkaminaDianePie/aodi/dev-status.svg)](https://david-dm.org/PinkaminaDianePie/aodi?type=dev)
[![dependencies Status](https://david-dm.org/PinkaminaDianePie/aodi/status.svg)](https://david-dm.org/PinkaminaDianePie/aodi)

AODI is a IoC container for JS apps. Works both on browser and Node.JS. Compatible with [Flow](https://flow.org)

## Installation
```
$ npm install aodi --save
```

## Usage

You should create instance of Injector class, provide dependencies for it and create instances of classes, which will ask for this dependencies. Thats it.

```javascript
// 'real-world' example - part of app config is stored on file system, part saved in database from
// admin dashboard, we want to fetch them and merge in single object which will be used in our app.

import { Injector, Token, inject, injectable } from 'aodi';
import { Database } from 'any-db-you-like';

const ConfigFromFile = new Token();
const ConfigFromDB = new Token();
const AppConfig = new Token();

const injector = new Injector();

injector.provide(ConfigFromFile, {
  factory: async () => fs.readFile(/* fetch config data from file */),
});

injector.provide(Database, {
  factory: async () => Database.createConnection(/* establish connection to DB */),
  singleton: true, // we will use same connection every time instead of creating new one
});

injector.provide(ConfigFromDB, {
  dependencies: [ConfigFromFile, Database], // we need config from file and our DB connection
  factory: async (config, db) => db.fetchDBdata(/*fetch database part of config*/),
});

injector.provide(AppConfig, {
  dependencies: [ConfigFromFile, ConfigFromDB],
  factory: () => ({ ...ConfigFromFile, ...ConfigFromDB }),
});

@injectable
class SomeClassWhichUseConfig {
  @inject(AppConfig) config;

  someMethod(){
    this.config; // any logic which use config
  }
}

injector.provide(SomeClassWhichUseConfig);

@injectable
class App {
  @inject(AppConfig) config;
  @inject(SomeClassWhichUseConfig) myClass;

  anyMethod() {
    this.config;
    this.myClass;
  }
}

injector.provide(App);

async function start() {
  const app = injector.get(App);
}

start();
```

Of course, in real project you will split this on different files, put class per file, separate providers from classes, which ask for dependency etc, but in general usage can be simple like in example above.

More complex documentation available below:

### Table of Contents

-   [DependencyInjection](#dependencyinjection)
    -   [inject](#inject)
    -   [injectable](#injectable)
-   [Token](#token)
-   [Injector](#injector)
    -   [provide](#provide)
    -   [provider](#provider)
    -   [get](#get)
    -   [create](#create)
-   [Provider](#provider-1)
    -   [provides](#provides)
    -   [singleton](#singleton)
    -   [dependencies](#dependencies)

## DependencyInjection

Provides decorator utilities for injecting dependencies into user classes

### inject

Marks property as injectable. This property will be resolved by DI system and injected on
instantiating of this class. It will be passed to class constructor as part of key:value oject
in first param, so it can be used in constructor. Params for parent class are also included. If
class has no constructor at all - resolved dependency will be assigned to class instance by
Object.assign().

**Parameters**

-   `dependency` **([Token](#token)&lt;T> | [Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function))** dependency which will be injected to annotated field

**Examples**

```javascript
// ES6+ way
import { inject, Token } from 'aodi';

const MyDependencyToken = new Token();
class C{
  @inject(MyDependencyToken) foo;
}
```

```javascript
// Flow way
import { inject, Token } from 'aodi';

interface Dep {};

const MyDependencyToken: Token<Dep> = new Token();
class C{
  @inject(MyDependencyToken) foo: Dep;
}
```

```javascript
// Example of usage in constructor
import { inject, Token } from 'aodi';

const MyDependencyToken = new Token();
class C{
  @inject(MyDependencyToken) foo;
  constructor({ foo }) {
    // foo is available as a property of params object.
  }
}
```

Returns **[Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)** decorator to annotate class field

### injectable

Marks class a injectable. If class use @inject decorators it will be annotated automatically, so
it's only mandatory to mark child classes without any @inject to be able to use dependencies
provided by parent. You can still mark all classes which uses DI for consistency.

**Parameters**

-   `target` **Class** class to annotate

**Examples**

```javascript
import { injectable, inject, Token } from 'aodi';

const MyDependencyToken = new Token();
@injectable //not necessary here, because we already used @inject
class C{
  @inject(MyDependencyToken) foo;
}
```

```javascript
import { injectable, inject, Token } from 'aodi';

const MyDependencyToken = new Token();
class Foo {
  @inject(MyDependencyToken) foo;
}

@injectable //necessary, DI should know about parent's params before instantiating Foo
class Bar extends Foo {
  bar() {
    this.foo; //it will be available in child because parent asked this dependency
  }
}
```

Returns **Class** annotated class

## Token

Class-placeholder, used to bound injectable parameter with some resolvers. It can be used to
provide non-class dependencies like numbers or plain objects for example, but it still usefull
for classes, which implements same interface, but not inherited from any common base class.

**Examples**

```javascript
// ES6+ way
import { Token } from 'aodi';

const MyDependencyToken = new Token();
```

```javascript
// flow way
import { Token } from 'aodi';

interface MyDependency {}

// providing interface helps flow to understand to which dependency this token will be resolved
const MyDependencyToken<MyDependency> = new Token();
```

## Injector

Main class, responsible for creating DI container. It purpose to be used at entry point of
application and provide dependencies to all classes, constructed inside of container.

### provide

Register a simple provider, which resolves one dependency for one token. Syntax is similar to
Angular framework.

**Parameters**

-   `token` **([Token](#token)&lt;T> | [Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function))** token for dependency
-   `provider` **[Provider](#provider)?** provider which will resolve asked dependency

**Examples**

```javascript
// resolves to class instance when someone will ask this class as a dependency
import { Injector } from 'aodi';

class Foo {}

const injector = new Injector();

injector.provide(Foo);
```

```javascript
// resolves to instance of other class when someone will ask class or token as a dependency.
import { Injector, Token } from 'aodi';

class Foo {}
class Bar {}

const MyToken = new Token();

const injector = new Injector();

injector.provide(Foo, Bar); //provides Bar when someone will ask for Foo
injector.provide(MyToken, Bar); //provides Bar when someone will ask for MyToken
```

```javascript
// resolves to data constructed by factory function
import { Injector, Token } from 'aodi';

const MyToken = new Token();

const injector = new Injector();

injector.provide(MyToken, { factory: () => 42 }); //provides 42 for MyToken
```

```javascript
// marks factory as singleton, so it will be calculated only once
import { Injector, Token } from 'aodi';

const MyToken = new Token();

const injector = new Injector();

injector.provide(MyToken, {
  singleton: true,
  factory: () => 42
});
```

```javascript
// provide dependencies for factory
import { Injector, Token } from 'aodi';

const MyToken = new Token();
const MyOtherToken = new Token();

const injector = new Injector();

injector.provide(MyToken, { factory: () => 'foo' }); //provides 42 for MyToken
injector.provide(MyOtherToken, {
  dependencies: [MyToken],
  factory: (resolvedToken) => resolvedToken + 'bar';
});
```

```javascript
// provide is chainable method
import { Injector } from 'aodi';

class Foo {}
class Bar {}

const injector = new Injector();

injector
  .provide(Foo)
  .provide(Bar);
```

Returns **[Injector](#injector)** same injector for chaining purposes

### provider

-   **See: [Provider](#provider)**

Register a complex provider, based on `class`, like in java DI libraries. More details at
[Provider](#provider) section

**Parameters**

-   `provider` **[Provider](#provider)** class, annotated as provider, which will resolve dependencies

**Examples**

```javascript
// register provider
import { Injector, Token, provides } from 'aodi';

const MyToken = new Token();

const injector = new Injector();

class MyProvider {
  @provides foo: MyToken = 'foo'; // MyToken will be resolved to string 'foo';
}

injector.provider(MyProvider);
```

Returns **[Injector](#injector)** same injector for chaining purposes

### get

Return instance of requested dependency. Dependency should be provided before using
`injector.get()` by calling `injector.provide()` or `injector.provider()`. Dependencies without
provider can't be resolved. Should be used only at entry point of application, if possible, all
classes inside DI container should ask for dependency by `@inject` annotations. Managing
dependencies by yourself inside DI container is an anti-pattern in DI.

**Parameters**

-   `token` **([Token](#token)&lt;T> | [Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function))**

**Examples**

```javascript
// return resolved dependency
import { Injector, Token } from 'aodi';

const MyToken = new Token();

const injector = new Injector();

injector.provide(MyToken, { factory: () => 42 });

// you can call code below inside of async function or use promises
const foo = await injector.get(MyToken); // foo === 42
```

Returns **[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;T>**

### create

Create instance of provided class, resolving dependencies for it, but class shouldn't have own
provider, like in `injector.get()`. This method can be usefull when you import class
dynamically in runtime. You can also use it inside of your factories. As second argument this
method receive object with params to class, which will be merged with resolved dependencies.

**Parameters**

-   `ClassToConstruct` **Class** class to construct with dependency resolve
-   `additionalParams` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)?** object, which will be passed to constructor

**Examples**

```javascript
// constructing class
import { Injector, Token, inject } from 'aodi';

const MyToken = new Token();

const injector = new Injector();

injector.provide(MyToken, { factory: () => 42 });

class Foo {
  @inject(MyToken) bar;

  constructor({ foo, bar }) {
    // foo === 24
    // bar === 42
  }
}

// you can call code below inside of async function or use promises
const foo = injector.create(Foo, { foo: 24 });
```

```javascript
// using in factories
import { Injector, Token, inject } from 'aodi';

const ConfigFromDB = new Token();

const injector = new Injector();

injector.provide(ConfigFromDB, { factory: async () => fetch(/.../) });

class AppConfig {
  @inject(ConfigFromDB) configFromDB;

  constructor({ configFromDB, ...configFromFile }) {
    // configFromDB resolved as a dependency
    // configFromFile passed from factory below as a parameter
  }
}

const Config = new Token();

injector.provide(Config, { factory: async () => {
  const configData = await loadConfigFromFileHere();
  return injector.create(AppConfig, configData);
}});

// you can call code below inside of async function or use promises
const config = injector.get(Config);
```

Returns **[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;T>** promise, which will be resolved to class instance

## Provider

Provides utilities for injecting dependencies and performing IoC

### provides

Annotates provider to be responsible for provide dependency for passed DI token. After that DI
system will know that this method should be called when any module will ask dependency,
associated with this token. It is also possible to annotate class field, in that case value of
field will be used as resolved dependency. You can choose any name for method/field, DI does not
use it, only annotations and value are important.

**Parameters**

-   `token` **([Token](#token)&lt;T> | [Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function))** token to be provided by method

**Examples**

```javascript
// you can provide both value as class field or return it from factory method
import { Injector, Token, provides } from 'aodi';

const MyToken = new Token();
const MyOtherToken = new Token();

const injector = new Injector();

class MyProvider {
  @provides(MyToken)
  foo = 'foo';

  @provides(MyOtherToken)
  bar() {
    return 'bar';
  }
}

// you can call code below inside of async function or use promises
const myToken = injector.get(MyToken); // 'foo'
const myOtherToken = injector.get(MyOtherToken); // 'bar'
```

Returns **Decorator** decorator function which can be applied to method or field only

### singleton

Annotates provider method as a singleton. Annotated method will be called only once, returned
value will be cached and returned on all further method calls.

**Parameters**

-   `target` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)**
-   `key` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)**
-   `descriptor` **DescriptorMethod**

**Examples**

```javascript
// you can see that singleton returns same data every time
import { Injector, Token, provides, singleton } from 'aodi';

const MyToken = new Token();

const injector = new Injector();

class MyProvider {
  @provides(MyToken)
  @singleton
  foo() {
    return Symbol('foo');
  }
}

injector.provider(MyProvider);

// you can call code below inside of async function or use promises
await injector.get(MyToken) === await injector.get(MyToken) // true
```

Returns **DescriptorMethod** decorated method descriptor

### dependencies

Annotates provider method with dependencies list. When this method will be invoked, dependencies
list will be resolved by DI mechanism and passed as method parameters.

**Parameters**

-   `dependenciesList` **...[Token](#token)** dependencies to inject

**Examples**

```javascript
// you can see that singleton returns same data every time
import { Injector, Token, provides, dependencies } from 'aodi';

const MyToken = new Token();
const MyOtherToken = new Token();

const injector = new Injector();

class MyProvider {
  @provides(MyOtherToken)
  foo = 'foo';

  @provides(MyToken)
  @dependencies(MyOtherToken)
  bar(otherToken) {
    return otherToken + 'bar';
  }
}

injector.provider(MyProvider);

// you can call code below inside of async function or use promises
const myToken = await injector.get(MyToken); // 'foobar';
```

Returns **[Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)** decorator function which can be applied to method only

## License
[MIT](LICENSE)
