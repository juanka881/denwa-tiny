import { getParameterList } from './decorators';
import { Class, getParamterName, isConstructor } from './reflection';
import { LookupKey, ResolveKey, Resolver, ValueLifetime, ValueProvider, ValueRegistration } from './types';
import { getLookupKey, valueKeyToString } from './utils';

/**
 * use to generate service registration ids
 */
let registrationId = 0;
export function nextId() {
	registrationId += 1;
	return registrationId;
}

/**
 * uses reflection to automatically read constructor
 * parameter arguments and resolve the parameters
 * for a class from the container and create a new 
 * class instance
 */
export class ClassValueProvider implements ValueProvider {
	readonly class: Class<any>;

	constructor(cls: Class<any>) {
		this.class = cls;
	}

	get(resolver: Resolver): any {
		const parameters = getParameterList(this.class);
		if(parameters.length == 0) {

			// no constructor parameters
			if(this.class.length === 0) {
				return new this.class();
			}
			else {
				throw new Error(`resolve failed: cannot create class=${this.class.name}, parameters required but no parameter list found`);
			}
		}

		const values = parameters.map((parameter) => {
			try {
				return resolver.resolve(parameter.key);
			}
			catch(error) {
				const parameterName = getParamterName(this.class, parameter.index);
				const message = `resolve failed: cannot inject parameter=${parameterName}, key=${valueKeyToString(parameter.key)}, class=${this.class.name}.`;
				const resolveFail = new Error(message);
				(resolveFail as any).cause = error;

				throw resolveFail;
			}
		});

		return new this.class(...values);
	}
}

/**
 * container registry, used to maintain 
 * the mappings of lookup keys to servie registrations
 */
export class Registry {
	items: Map<LookupKey, ValueRegistration[]>;

	constructor() {
		this.items = new Map();
	}

	/**
	 * adds a registration for a lookup key
	 * @param key lookup key
	 * @param registration registration object
	 */
	add(key: LookupKey, registration: ValueRegistration): void {
		let list = this.items.get(key);
		if(!list) {
			list = [];
			this.items.set(key, list);
		}

		list.push(registration);
	}

	/**
	 * gets a registration from a lookup key
	 * @param key service lookup key
	 * @param tag service tag
	 * @returns registration if found, undefined otherwise
	 */
	get(key: LookupKey, tag?: string): ValueRegistration | undefined {
		let list = this.items.get(key);
		if(!list) {
			return undefined;
		}

		if(tag) {
			let index = -1;
			const len = list.length;
			for(let i = len - 1; i >= 0; i -= 1) {
				if(list[i].tag === tag) {
					index = i;
					break;
				}
			}

			if(index === -1) {
				return undefined;
			}

			return list[index];
		}

		return list[list.length - 1];
	}

	/**
	 * checks if a registration exists for a given lookup key and tag
	 * @param key service lookup key
	 * @param tag service tag
	 * @returns true if it exists, false otherwise
	 */
	has(key: LookupKey, tag?: string): boolean {
		if(tag) {
			return this.get(key, tag) !== undefined;
		}
		
		return this.items.has(key);
	}
}

/**
 * register options, use to specify the configuration
 * for a registration
 */
export interface RegisterOptions<TValue = any> {
	/**
	 * resolve key
	 */
	key: ResolveKey<TValue>;

	/**
	 * value tag
	 */
	tag?: string;

	/**
	 * value lifetime, defaults to 'request'
	 */
	lifetime?: ValueLifetime;

	/**
	 * class constructor, if provided
	 * the container will automatically try to resolve
	 * all the constructor parameters from the container
	 * for the given class and return an instance of the 
	 * class when the service value is resolved
	 */
	class?: Class<TValue>;

	/**
	 * singleton value, if provided
	 * the container will return this static value
	 * every time the service value is resolved
	 */
	value?: TValue;

	/**
	 * value builder, if provided,
	 * the container will use this function callback
	 * and pass a resolver instance to delegate the 
	 * resolution of the service value
	 * @param resolver resolver instance
	 * @returns value
	 */
	get?: (resolver: Resolver) => TValue;
}

/**
 * dependency injection container.
 */
export class Container implements Resolver {
	registry: Registry;
	root: Container;
	parent?: Container;
	private scope: Map<LookupKey, Map<string, any>>;

	constructor(parent?: Container) {
		this.registry = new Registry();
		this.parent = parent;
		this.root = this.parent ? this.parent.root : this;
		this.scope = new Map<LookupKey, Map<string, any>>();
	}

	private getScopeValue(key: LookupKey, tag: string): any {
		const values = this.scope.get(key);
		if(!values) {
			return undefined;
		}

		const value = values.get(tag);
		return value;
	}

	private setScopeValue(key: LookupKey, tag: string, value: any) {
		let values = this.scope.get(key);
		if(!values) {
			values = new Map<string, any>();
			this.scope.set(key, values);
		}

		values.set(tag, value);
	}

	private registerInner(options: RegisterOptions): void {
		let provider: ValueProvider;

		if(options.get) {
			// use get provider
			provider = { get: options.get }
		}		
		else if(options.class) {
			// use class provider
			provider = new ClassValueProvider(options.class);
		}
		else if(options.value) {
			// use value provider
			provider = { get: () => options.value }
		}	
		else if(isConstructor(options.key)) {
			// no class provider set, but since key is a class constructor
			// use key as class provider
			provider = new ClassValueProvider(options.key as Class<any>);
		}
		else {
			throw new Error(`unknow provider type, options=${JSON.stringify(options)}`);
		}

		const registration: ValueRegistration = {
			id: nextId(),
			key: options.key,
			lifetime: options.lifetime ?? 'request',
			tag: options.tag,
			provider
		}

		const lookup = getLookupKey(registration.key);
		this.registry.add(lookup, registration);
	}

	register<TValue = any>(options: RegisterOptions<TValue>): void {	
		this.registerInner(options);
	}

	resolve<TValue = any>(key: ResolveKey<TValue>, tag?: string): TValue {
		const value = this.tryResolve(key, tag);
		if(value === undefined)  {
			throw new Error(`resolve failed: no registration found for service, key=${valueKeyToString(key)}, tag=${tag}`);
		}

		return value;
	}

	tryResolve<TValue = any>(key: ResolveKey<TValue>, tag?: string): TValue | undefined {
		const lookup = getLookupKey(key);
		let scope: Container | undefined = this;
		let registration: ValueRegistration | undefined;

		while(scope) {
			registration = scope.registry.get(lookup, tag);
			if(registration) {
				break;
			}

			scope = scope.parent;
		}

		const isUnregisteredClass = 
			registration === undefined 
			&& tag === undefined
			&& isConstructor(lookup);
				

		if(isUnregisteredClass) {
			const provider = new ClassValueProvider(lookup as Class<any>)
			const instance = provider.get(this);
			return instance;
		}

		if(!registration || !scope) {
			return undefined;
		}

		switch(registration.lifetime) {
			// resolve scoped values from the root
			case 'single': {
				let value = this.root.getScopeValue(lookup, tag ?? '');
				if(value) {
					return value;
				}

				value = registration.provider.get(this);
				this.root.setScopeValue(lookup, tag ?? '', value);
				return value;
			}

			// always return a new value
			case 'request': {
				let value = registration.provider.get(this);
				return value;
			}

			// resolve scoped values from the current scope
			// if not found walk up 
			case 'scope': {
				let value = this.getScopeValue(lookup, tag ?? '');
				if(value) {
					return value;
				}

				value = registration.provider.get(this);
				this.setScopeValue(lookup, tag ?? '', value);
				return value;
			}
		}
	}

	createScope(): Container {
		return new Container(this);
	}
}