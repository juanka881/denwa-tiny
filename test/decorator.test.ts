import { suite, test, assert, beforeEach } from 'vitest';
import { classResolveInfoCache, clearClassResolveInfoCache, getClassResolveInfo, inject, injectable, scoped, singleton } from '../src/decorators.js';
import { InvalidConstructorError, InvalidParameterError } from '../src/errors.js';
import { symbolKey } from '../src/utils.js';

suite('classResolveInfoCache', function() {
	beforeEach(function() {
		clearClassResolveInfoCache();
	});

	test('can clear cache', function() {
		assert.equal(classResolveInfoCache.size, 0);
	});

	test('can resolve class info', function() {
		class Bar {}

		@injectable()
		class Foo {
			constructor(public bar: Bar) {}
		}

		const classInfo = getClassResolveInfo(Foo);

		assert.equal(classInfo.key, Foo);
		assert.equal(classInfo.parameters.size, 1);

		const parameterInfo = classInfo.parameters.get(0)!;
		assert.equal(parameterInfo.parameter.index, 0);
		assert.strictEqual(parameterInfo.key, Bar);
	});

	test('applying injectable decorator to non-constructor throws', function() {
		assert.throws(() => {
			const invalidTarget: any = () => {};
			injectable()(invalidTarget);
		}, InvalidConstructorError);
	});

	test('singleton decorator sets lifetime to "single"', function() {
		@singleton()
		class Foo {}

		const classInfo = getClassResolveInfo(Foo);
		assert.equal(classInfo.lifetime, 'single');
	});

	test('scoped decorator sets lifetime to "scope"', function() {
		@scoped()
		class Foo {}

		const classInfo = getClassResolveInfo(Foo);
		assert.equal(classInfo.lifetime, 'scope');
	});

	test('can inject constructor parameters', function() {
		const Magic = symbolKey<number>('magic');

		@injectable()
		class Foo {
			constructor(@inject(Magic) public magic: number) {}
		}

		const classInfo = getClassResolveInfo(Foo);
		const parameterInfo = classInfo.parameters.get(0)!;
		assert.strictEqual(parameterInfo.key, Magic);
	});

	test('inject throws if it cant find parameter', function() {
		const Magic = symbolKey<number>('magic');

		@injectable()
		class Foo {
			constructor(@inject(Magic) public magic: number) {}
		}

		assert.throws(() => {
			inject(Magic)(Foo, undefined, -1);
		}, InvalidParameterError);
	});
});
