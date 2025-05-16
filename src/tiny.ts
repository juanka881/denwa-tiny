import { ClassValueProvider, TinyContainer } from './container.js';
import { Class } from './reflection.js';
import { Lifetime, Provider, Registration, ResolveCallback, ResolveKey } from './types.js';

export class TinyBuilder<TValue = any> {
	private _key?: ResolveKey<TValue>;
	private _lifetime?: Lifetime;
	private _tag?: string;
	private _provider?: Provider;

	build(): Registration {
		if(!this._key) {
			throw new Error('key is required');
		}

		if(!this._provider) {
			throw new Error('provider is required');
		}

		const registration: Registration = {
			id: 0,
			key: this._key,
			lifetime: this._lifetime ?? 'transient',
			tag: this._tag,
			provider: this._provider

		}

		return registration;
	}

	singleton(): this {
		this._lifetime = 'single';
		return this;
	}

	transient(): this {
		this._lifetime = 'transient';
		return this;
	}

	scoped(): this {
		this._lifetime = 'scope';
		return this;
	}

	as(key: ResolveKey<TValue>): this {
		this._key = key;
		return this;
	}

	tag(tag: string): this {
		this._tag = tag;
		return this;
	}

	create(resolver: ResolveCallback<TValue>): this {
		this._provider = { resolve: resolver };
		return this;
	}

	provider(provider: Provider): this {
		this._provider = provider;
		return this;
	}
}

export class Tiny {
	private builders: TinyBuilder[];

	constructor() {
		this.builders = [];
	}

	registerValue<TValue>(key: ResolveKey, value: any): TinyBuilder<TValue> {
		const builder = new TinyBuilder();
		this.builders.push(builder);

		builder.create(() => value)
			.as(key)
			.singleton();

		return builder;
	}

	registerClass<TValue>(_class: Class): TinyBuilder<TValue> {
		const builder = new TinyBuilder();
		this.builders.push(builder);

		builder.provider(new ClassValueProvider(_class)).as(_class);
		return builder;
	}

	register<TValue>(resolve: ResolveCallback<TValue>): TinyBuilder {
		const builder = new TinyBuilder();
		this.builders.push(builder);

		builder.create(resolve);
		return builder;
	}

	build(): TinyContainer {
		const container = new TinyContainer();
		for(const builder of this.builders) {
			const registration = builder.build();
			container.register(registration);
		}

		return container;
	}
}
