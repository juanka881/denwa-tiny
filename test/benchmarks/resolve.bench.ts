import { bench } from 'vitest';
import { ResolveContext, Tiny, inject, injectable, symbolKey } from '../../src/index.js';

class Bar {}

@injectable()
class Foo {
	constructor(public bar: Bar) {}
}

const Magic = symbolKey<number>('magic');

@injectable()
class Zul {
	constructor(
		public foo: Foo,
		@inject(Magic) public magic: number
	) {}
}

const tiny = new Tiny();
tiny.addValue('foo', 42);
tiny.addValue(Magic, 88);
tiny.add(t => new Foo(t.resolve(Bar)))
	.as(Foo)
	.tag('foo');

const container = tiny.build();

bench('resolve value', function() {
	container.resolve('foo');
});

bench('resolve class', function() {
	container.resolve(Bar);
});

bench('resolve class deps', function() {
	container.resolve(Foo);
});

bench('resolve class deep deps', function() {
	container.resolve(Zul);
});

bench('resolve callback', function() {
	container.resolve(Foo);
});

bench('resolve tagged callback', function() {
	container.resolve(Foo, 'foo');
});
