import { assert, suite, test } from 'vitest';
import { Tiny, TinyBuilder } from '../src/tiny.js';
import { Provider, ResolveCallback } from '../src/types.js';
import { injectable } from '../src/decorators.js';

suite('TinyBuilder', function () {
	test('can build registration', function () {
		const builder = new TinyBuilder();
		const reg = builder.as('log')
			.with(() => console.log)
			.build();

		assert.equal(reg.id, 0);
		assert.equal(reg.key, 'log');
		assert.equal(reg.lifetime, 'transient');
		assert.equal(reg.tag, undefined);
		assert.isObject(reg.provider);
		assert.isFunction(reg.provider.resolve);
	});

	test('build throws if no key set', function () {
		const builder = new TinyBuilder();
		assert.throws(() => builder.build());
	});

	test('build throws if no provider set', function () {
		const builder = new TinyBuilder();
		builder.as('foo');
		assert.throws(() => builder.build());
	});

	test('can set singleton lifetime', function () {
		const builder = new TinyBuilder();
		builder.as('foo').with(() => 42).singleton();

		const reg = builder.build();
		assert.equal(reg.lifetime, 'single');
	});

	test('can set transient lifetime', function () {
		const builder = new TinyBuilder();
		builder.as('foo').with(() => 42).transient();

		const reg = builder.build();
		assert.equal(reg.lifetime, 'transient');
	});

	test('can set scoped lifetime', function () {
		const builder = new TinyBuilder();
		builder.as('foo').with(() => 42).scoped();

		const reg = builder.build();
		assert.equal(reg.lifetime, 'scope');
	});

	test('can set provider', function () {
		const builder = new TinyBuilder();
		const provider: Provider = {
			resolve: () => 88
		};
		builder.as('foo').provider(provider);

		const reg = builder.build();
		assert.strictEqual(reg.provider, provider);
	});

	test('can set tag', function () {
		const builder = new TinyBuilder();
		builder.as('foo').with(() => 42).tag('bar');

		const reg = builder.build();
		assert.equal(reg.tag, 'bar');
	});
});

suite('Tiny', function () {
	test('can build container', function () {
		const tiny = new Tiny();
		const container = tiny.build();
		assert.ok(container);
	});

	test('can add value', function () {
		const tiny = new Tiny();
		const key = 'foo';
		const value = 42;
		tiny.addValue(key, value);

		const container = tiny.build();
		const actual = container.resolve(key);

		assert.equal(actual, value);
	});

	test('can add class', function () {
		@injectable()
		class Foo {}

		const tiny = new Tiny();
		tiny.addClass(Foo);

		const container = tiny.build();
		const instance = container.resolve(Foo);

		assert.instanceOf(instance, Foo);
	});

	test('can add using callback', function () {
		const key = 'foo';
		const value = 'hello';
		const resolve: ResolveCallback = () => value;
		const tiny = new Tiny();
		tiny.add(resolve).as(key);

		const container = tiny.build();
		const result = container.resolve(key);

		assert.equal(result, value);
	});
});

