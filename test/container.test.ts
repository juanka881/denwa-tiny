import { suite, test, assert } from 'vitest';
import { Registry, TinyContainer, nextId, resetIds } from '../src/container.js';
import { Tiny, TinyBuilder } from '../src/tiny.js';
import { clearClassResolveInfoCache, getClassResolveInfo, inject, injectable } from '../src/decorators.js';
import { getLookupKey, symbolKey } from '../src/utils.js';
import { InvalidParameterError, ResolveError } from '../src/errors.js';

@injectable()
class Bar {}

@injectable()
class Foo {
	constructor(public bar: Bar) {}
}

const MagicKey = symbolKey<number>('Magic');

@injectable()
class Zul {
	constructor(@inject(MagicKey) public magic: number) {}
}

suite('registration ids', function() {
	test('can get registration id', function() {
		resetIds();
		const id = nextId();
		assert.equal(id, 1);
	});

	test('can reset registration id', function() {
		resetIds();
		const id1 = nextId();
		const id2 = nextId();

		assert.equal(id1, 1);
		assert.equal(id2, 2);
	});
});

suite('Registry', function() {
	test('can create', function() {
		const registry = new Registry();
		assert.ok(registry);
	});

	test('can set and get registration', function() {
		const builder = new TinyBuilder();
		const reg = builder.with(() => 42).as('foo').build();

		const registry = new Registry();
		const key = getLookupKey(reg.key);
		registry.set(key, reg);

		const actual = registry.get(key);
		assert.strictEqual(actual, reg);
	});

	test('get returns undefined if tag not found', function() {
		const builder = new TinyBuilder();
		const reg = builder.with(() => 42).as('foo').build();

		const registry = new Registry();
		const key = getLookupKey(reg.key);
		registry.set(key, reg);

		const actual = registry.get(key, 'bar');
		assert.isUndefined(actual);
	});

	test('has can check if key exists', function() {
		const builder = new TinyBuilder();
		const reg = builder.with(() => 42).as('foo').build();
		const taggedReg = builder.with(() => 42)
			.as('foo')
			.tag('bar')
			.build();

		const registry = new Registry();
		const key = getLookupKey(reg.key);
		registry.set(key, reg);
		registry.set(key, taggedReg);

		assert.equal(registry.has(key), true);
		assert.equal(registry.has(key, 'bar'), true);
		assert.equal(registry.has('xxx'), false);
		assert.equal(registry.has('xxx', 'bar'), false);
	});
});

suite('TinyContainer', function() {
	test('can create', function() {
		const container = new TinyContainer();
		assert.ok(container);
	});

	test('can resolve value', function() {
		const tiny = new Tiny();
		const key = 'foo';
		const value = 42;
		tiny.addValue(key, value);

		const container = tiny.build();
		const _value = container.resolve(key);

		assert.equal(value, _value);
	});

	test('can resolve class', function() {
		class Foo {}
		const tiny = new Tiny();
		tiny.addClass(Foo);

		const container = tiny.build();
		const value = container.resolve(Foo);

		assert.instanceOf(value, Foo);
	});

	test('can resolve using callback', function() {
		const tiny = new Tiny();
		const key = 'foo';
		const value = 42;
		tiny.add(() => value).as(key);

		const container = tiny.build();
		const _value = container.resolve(key);

		assert.equal(value, _value);
	});

	test('can resolve class with dependencies', function() {
		const tiny = new Tiny();
		const container = tiny.build();
		const value = container.resolve(Foo);

		assert.instanceOf(value, Foo);
		assert.instanceOf(value.bar, Bar);
	});

	test('can inject dependencies via decorator', function() {
		const tiny = new Tiny();
		tiny.addValue(MagicKey, 42);

		const container = tiny.build();
		const value = container.resolve(Zul);

		assert.instanceOf(value, Zul);
		assert.equal(value.magic, 42);
	});

	test('can override registration', function() {
		const tiny = new Tiny();
		tiny.addValue(MagicKey, 42);
		tiny.addValue(MagicKey, 100);

		const container = tiny.build();
		const value = container.resolve(MagicKey);

		assert.equal(value, 100);
	});

	test('can add multiple values of same key with tag', function() {
		const tiny = new Tiny();
		tiny.add(() => 42).as(MagicKey).tag('foo');
		tiny.add(() => 100).as(MagicKey).tag('bar');

		const container = tiny.build();
		const value1 = container.resolve(MagicKey, 'foo');
		const value2 = container.resolve(MagicKey, 'bar');

		assert.equal(value1, 42);
		assert.equal(value2, 100);
	});

	test('resolve unregistered tag throws', function() {
		const tiny = new Tiny();
		const container = tiny.build();

		assert.throws(() => container.resolve(MagicKey, 'foo'));
	});

	test('resolve undecorated class throws', function() {
		class FooPrime {
			constructor(public bar: Bar) {}
		}
		const tiny = new Tiny();
		const container = tiny.build();

		assert.throws(() => container.resolve(FooPrime), ResolveError);
	});

	test('resolve throws class if parameter info not found', function() {
		clearClassResolveInfoCache();

		@injectable()
		class FooPrime {
			constructor(public bar: Bar) {}
		}

		const tiny = new Tiny();
		const container = tiny.build();
		const classInfo = getClassResolveInfo(FooPrime);
		classInfo.parameters.set(-1, classInfo.parameters.get(0)!);
		classInfo.parameters.delete(0);

		let error: Error;
		try {
			container.resolve(FooPrime)
		}
		catch(e) {
			error = e as Error;
		}

		error = error!;
		assert.instanceOf(error, ResolveError);
		if(error instanceof ResolveError) {
			assert.instanceOf(error.cause, InvalidParameterError);
		}
	});

	test('resolve throws class if parameter type not set', function() {
		clearClassResolveInfoCache();

		@injectable()
		class FooPrime {
			constructor(public bar: Bar) {}
		}

		const tiny = new Tiny();
		const container = tiny.build();
		const classInfo = getClassResolveInfo(FooPrime);
		classInfo.parameters.get(0)!.key = undefined;

		let error: Error;
		try {
			container.resolve(FooPrime)
		}
		catch(e) {
			error = e as Error;
		}

		error = error!;
		assert.instanceOf(error, ResolveError);
		if(error instanceof ResolveError) {
			assert.instanceOf(error.cause, InvalidParameterError);
		}
	});

	test('can create child container scope', function() {
		const tiny = new Tiny();
		const container = tiny.build();
		const child1 = container.createScope();
		const child2 = child1.createScope();

		assert.ok(child1);
		assert.ok(child2);
		assert.strictEqual(child1.root, container);
		assert.strictEqual(child1.parent, container);

		assert.strictEqual(child2.root, container);
		assert.strictEqual(child2.parent, child1);
	});

	test('single lifetime returns the same value always', function() {
		const tiny = new Tiny();
		tiny.addClass(Foo).singleton();

		const container = tiny.build();
		const child1 = container.createScope();

		const foo1 = container.resolve(Foo);
		const foo2 = child1.resolve(Foo);

		assert.strictEqual(foo1, foo2);
	});

	test('scope lifetime returns the same instance for that container scope', function() {
		const tiny = new Tiny();
		tiny.addClass(Foo).scoped();
		tiny.addClass(Bar).scoped();

		const container = tiny.build();
		const child1 = container.createScope();

		const rootFoo1 = container.resolve(Foo);
		const rootFoo2 = container.resolve(Foo);
		const rootBar1 = container.resolve(Bar);
		const rootBar2 = container.resolve(Bar);

		const childFoo1 = child1.resolve(Foo);
		const childFoo2 = child1.resolve(Foo);
		const childBar1 = child1.resolve(Bar);
		const childBar2 = child1.resolve(Bar);

		assert.strictEqual(rootFoo1, rootFoo2);
		assert.strictEqual(childFoo1, childFoo2);
		assert.strictEqual(rootBar1, rootBar2);
		assert.strictEqual(childBar1, childBar2);

		assert.notStrictEqual(rootFoo1, childFoo1);
		assert.notStrictEqual(rootBar1, childBar1);
	});
});



