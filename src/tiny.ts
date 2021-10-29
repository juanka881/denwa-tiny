import { Map as ImmutableMap } from 'immutable';
import * as uuid from 'uuid';

interface ClassType<T = any> {
    new(...args: any[]): T;
}

export interface StringKey<T> {
	type: 'string';
	value: string;
}

export interface SymbolKey<T> {
	type: 'symbol';
	value: Symbol;
}

export interface ClassKey<T> {
	type: 'class';
	value: ClassType<T>;
}

export const __type = Symbol('@@type');
export const ValueKeyType = Symbol('ValueKey');

export type ValueKey<T> = StringKey<T> | SymbolKey<T> | ClassKey<T>;

export type ResolveKey<T> = ValueKey<T> | string | ClassType<T>;

export function stringKey<T>(name: string): StringKey<T> {
	return { 
		[__type]: ValueKeyType,
		type: 'string', 
		value: name, 
		valueOf() { return name } 
	} as StringKey<T>;
}

export function symbolKey<T>(name: string): SymbolKey<T> {
	const symbol = Symbol(name);
	return { 
		[__type]: ValueKeyType,
		type: 'symbol', 
		value: symbol, 
		valueOf() { return symbol } 
	} as SymbolKey<T>;
}

export function classKey<T>(type: ClassType<T>): ClassKey<T> {
	return { 
		[__type]: ValueKeyType,
		type: 'class', 
		value: type, 
		valueOf() { return type } 
	} as ClassKey<T>;
}

export function isValueKey(key: any): boolean {
	return (key && key[__type] === ValueKeyType)
}

export function getKeyName(key: ResolveKey<any>): string {
	if(isValueKey(key)) {
		const valueKey = key as ValueKey<any>;
		switch(valueKey.type) {
			case 'string':
				return valueKey.value;
	
			case 'symbol':
				return valueKey.value.description ?? 'unkown';
	
			case 'class':
				return valueKey.value.name;
	
			default: 
				return 'unknown';
		}
	}
	else if(typeof key === 'string') {
		return key;
	}
	else if(typeof key === 'function') {
		return key.name;
	}
	else {
		return 'unknown'
	}
}

export function keyToString(key: ResolveKey<any>): string {
	if(isValueKey(key)) {
		const valueKey = key as ValueKey<any>;
		switch(valueKey.type) {
			case 'string':
				return `string(${valueKey.value})`;
	
			case 'symbol':
				return `symbol(${valueKey.value.description ?? 'unkown'})`;
	
			case 'class':
				return `class${valueKey.value.name}`;
	
			default: 
				return 'unknown';
		}
	}
	else if(typeof key === 'string') {
		return `string(${key})`;
	}
	else if(typeof key === 'function') {
		return `class(${key.name})`;
	}
	else {
		return 'unknown'
	}
}

export function toValueKey<T>(key: ResolveKey<T>): ValueKey<T> {
	if(isValueKey(key)) {
		return key as ValueKey<T>;
	}
	else if(typeof key === 'string') {
		return stringKey(key);
	}
	else if(typeof key === 'function') {
		return classKey(key);
	}
	else {
		throw new Error(`unnkown key type: ${key}`);
	}
}

export type ValueBuilder = (t: Tiny) => any;
export type Lifetime = 'resolve' | 'single' | 'scope';

export interface Registration {
	id: string;
	key: ValueKey<any>;
	lifetime: Lifetime;
	tag?: string;
	build: ValueBuilder;
	cache?: any;
}

export interface RegisterOptions {
	id?: string;
	key: ResolveKey<any>;
	build: ValueBuilder;
	tag?: string;
	lifetime?: Lifetime;
}

export interface ResolveOptions {
	tag?: string;
}

export interface ResolveResult<T> {
	ok: boolean;
	value?: T;
}

export interface Resolver {
	tryResolve<T>(key: ValueKey<T>, options?: ResolveOptions): ResolveResult<T>;
	resolve<T>(key: ValueKey<T>, options?: ResolveOptions): T;
	getResolver<T>(key: ValueKey<T>, options?: ResolveOptions): () => T;
}

export class ValueMap {
	items: ImmutableMap<ValueKey<any>, Registration[]>;

	constructor() {
		this.items = ImmutableMap<ValueKey<any>, Registration[]>();
	}

	private getList(key: ValueKey<any>): Registration[] {
		let list = this.items.get(key);
		if (!list) {
			list = [];
			this.items = this.items.set(key, list);
		}

		return list;
	}

	add(registration: Registration): void {
		const list = this.getList(registration.key);
		list.push(registration);
	}

	get(key: ValueKey<any>, tag?: string): Registration | undefined {
		const list = this.getList(key);
		if(list.length === 0) {
			return undefined;
		}

		let registration: Registration | undefined;

		if(tag) {
			registration = list.find(x => x.tag === tag);
		}
		else {
			registration = list[list.length - 1];
		}

		return registration;
	}

	getAll(key: ValueKey<any>): Registration[] {
		const list = this.getList(key);
		return list;
	}
}

export class TinyBuilder {
	private map: ValueMap;

	constructor(map?: ValueMap) {
		this.map = map ?? new ValueMap();
	}

	register(options: RegisterOptions): void {
		const valueKey = toValueKey(options.key);
		this.map.add({
			id: options.id ?? uuid.v1(),
			key: valueKey,
			lifetime: options.lifetime ?? 'resolve',
			tag: options.tag,
			build: options.build,
		});
	}

	registerBuilder(builder: TinyBuilder): void {
		builder.map.items.forEach((value) => {
			value.forEach(reg => {
				this.map.add(reg);
			});
		});
	}

	registerValue<T>(key: ResolveKey<T>, value: T): void {
		this.register({
			key,
			lifetime: 'scope',
			build: () => value
		});
	}

	registerSingle<T>(key: ResolveKey<T>, value: T): void {
		this.register({
			key, 
			lifetime: 'single',
			build: () => value
		});
	}

	getContainer(): Tiny {
		return new Tiny(this.map);
	}
}

export const ITiny = stringKey<Tiny>('Tiny');
export class Tiny implements Resolver {
	private root: Tiny;
	private parent?: Tiny;
	private map: ValueMap;
	private cache: ImmutableMap<ValueKey<any>, Map<string | undefined, any>>;

	constructor(map: ValueMap, parent?: Tiny) {
		this.root = this;
		this.map = map;
		this.parent = parent;
		this.cache = ImmutableMap<ValueKey<any>, Map<string | undefined, any>>();

		let current: Tiny | undefined = this;
		while(current) {
			if(current.parent === undefined) {
				this.root = current;
			}

			current = current.parent;
		}
	}

	getCache(tiny: Tiny, reg: Registration): any {
		const values = tiny.cache.get(reg.key);
		if(values) {
			const value = values.get(reg.tag);
			return value;
		}

		return undefined;
	}

	setCache(tiny: Tiny, reg: Registration, value: any): void {
		let values = tiny.cache.get(reg.key);
		if(!values) {
			values = new Map<string | undefined, any>();
			tiny.cache = tiny.cache.set(reg.key, values);
		}

		values.set(reg.tag, value);
	}

	tryResolve<T>(key: ResolveKey<T>, options?: ResolveOptions): ResolveResult<T> {
		let current: Tiny | undefined = this;

		// fallback to parent container
		// if not found
		while(current) {
			// find reg in current container
			const valueKey = toValueKey(key)
			const reg = current.map.get(valueKey, options?.tag);

			// if not found go to parent
			if(!reg) {
				current = current.parent;
				continue;
			}

			switch(reg.lifetime) {
			// always return a new value no caching
			case 'resolve': {
				return { ok: true, value: reg.build(this) };
			}

			// always return the same value cached at the
			// scope where defined
			case 'scope': {
				let value = this.getCache(this, reg);
				if(!value) {
					value = reg.build(this);
					this.setCache(this, reg, value);
				}

				return { ok: true, value };
			}

			// always return the same value cached at the root scope
			case 'single': {
				let value = this.getCache(this.root, reg);
				if(!value) {
					value = reg.build(this);
					this.setCache(this.root, reg, value);
				}

				return { ok: true, value };
			}
			}
		}

		return { ok: false };
	}

	resolve<T>(key: ResolveKey<T>, options?: ResolveOptions): T {
		const result = this.tryResolve(key, options);
		if (!result.ok) {
			throw new Error(`unable to resole key from tiny, key=${keyToString(key)}, tag=${options?.tag ?? ''}`);
		}

		return result.value!;
	}

	resolveAll<T>(key: ResolveKey<T>): T[] {
		const valueKey = toValueKey(key);
		const regs = this.map.getAll(valueKey);

		const values: T[] = [];
		for(const reg of regs) {
			const value = this.resolve(key, { tag: reg.tag });
			values.push(value);
		}

		return values;
	}

	getResolver<T>(key: ResolveKey<T>, options?: ResolveOptions): () => T {
		return () => this.resolve(key, options);
	}

	child(build?: (builder: TinyBuilder) => void): Tiny {
		const map = new ValueMap();
		if (build) {
			const builder = new TinyBuilder(map);
			build(builder);
		}

		return new Tiny(map, this);
	}
}