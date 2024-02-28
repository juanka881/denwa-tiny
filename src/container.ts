import { getClassResolveInfo } from './decorators.js';
import { InvalidParameterError, ResolveError } from './errors.js';
import { Class, getParamterName, isConstructor } from './reflection.js';
import { Container, LookupKey, ResolveKey, Provider, Registration, ResolveContext } from './types.js';
import { getLookupKey, valueKeyToString } from './utils.js';

/**
 * use to generate service registration ids
 */
let registrationId = 0;
export function nextId() {
	registrationId += 1;
	return registrationId;
}

/**
 * resets the registration id counter
 */
export function resetIds() {
	registrationId = 0;
}

/**
 * uses reflection to automatically read constructor
 * parameter arguments and resolve the parameters
 * for a class from the container and create a new
 * class instance
 */
export class ClassValueProvider implements Provider {
	readonly class: Class<any>;

	constructor(_class: Class<any>) {
		this.class = _class;
	}

	resolve(context: ResolveContext): any {
		if(this.class.length === 0) {
			return new this.class();
		}

		const classInfo = getClassResolveInfo(this.class);
		if(classInfo.parameters.size == 0) {
			throw new ResolveError(`cannot automatically resolve class=${this.class.name}. no constructor metadata found.`, {
				key: context.key,
				tag: context.tag,
				class: this.class
			});
		}

		const values: any[] = [];
		const parameterCount = classInfo.parameters.size;
		for(let parameterIndex = 0; parameterIndex < parameterCount; parameterIndex += 1) {
			const resolveParameter = classInfo.parameters.get(parameterIndex);
			try {
				if(!resolveParameter) {
					throw new InvalidParameterError(`cannot find parameter at index=${parameterIndex} from constructor metadata`, {
						class_name: this.class.name,
						parameter_index: parameterIndex
					})
				}

				if(!resolveParameter.key) {
					throw new InvalidParameterError(`invalid parameter key at index=${parameterIndex} from constructor metadata`, {
						class_name: this.class.name,
						parameter_index: parameterIndex,
						parameter_name: getParamterName(this.class, parameterIndex)
					})
				}

				const value = context.resolve(resolveParameter.key as ResolveKey, resolveParameter.tag);
				values.push(value);
			}
			catch(error) {
				const parameterName = getParamterName(this.class, parameterIndex);
				throw new ResolveError(`failed to inject parameter=${parameterName} for class=${this.class.name}`, {
					class: this.class,
					key: context.key,
					tag: context.tag,
					parameter_index: parameterIndex,
					parameter_name: parameterName,
					parameter_type: resolveParameter?.key
				}).setCause(error);
			}
		}

		return new this.class(...values);
	}
}

/**
 * container registry, used to maintain
 * the mappings of lookup keys to servie registrations
 */
export class Registry {
	items: Map<LookupKey, Registration[]>;

	constructor() {
		this.items = new Map();
	}

	/**
	 * adds a registration for a lookup key
	 * @param key lookup key
	 * @param registration registration object
	 */
	set(key: LookupKey, registration: Registration): void {
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
	get(key: LookupKey, tag?: string): Registration | undefined {
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
 * dependency injection container.
 */
export class TinyContainer implements Container {
	registry: Registry;
	root: TinyContainer;
	parent?: TinyContainer;
	private scope: Map<LookupKey, Map<string, any>>;

	constructor(parent?: TinyContainer) {
		this.registry = new Registry();
		this.parent = parent;
		this.root = this.parent ? this.parent.root : this;
		this.scope = new Map<LookupKey, Map<string, any>>();
		this.resolve = this.resolve.bind(this)
	}

	private getScopeValue(key: LookupKey, tag?: string): any {
		const values = this.scope.get(key);
		if(!values) {
			return undefined;
		}

		const valueKey = tag ?? '';
		const value = values.get(valueKey);
		return value;
	}

	private setScopeValue(key: LookupKey, value: any, tag?: string) {
		let values = this.scope.get(key);

		/* istanbul ignore next */
		if(!values) {
			values = new Map<string, any>();
			this.scope.set(key, values);
		}

		const valueKey = tag ?? '';
		values.set(valueKey, value);
	}

	private resolveInner<TValue = any>(context: ResolveContext): TValue | undefined {
		const { key, tag } = context;
		const lookup = getLookupKey(key);
		let scope: TinyContainer | undefined = this;
		let registration: Registration | undefined;

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
			const provider = new ClassValueProvider(lookup as Class)
			const instance = provider.resolve(context);
			return instance;
		}

		if(!registration || !scope) {
			return undefined;
		}

		switch(registration.lifetime) {
			// resolve scoped values from the root
			case 'single': {
				let value = this.root.getScopeValue(lookup, tag);
				if(value) {
					return value;
				}

				value = registration.provider.resolve(context);
				this.root.setScopeValue(lookup, value, tag);
				return value;
			}

			// always return a new value
			case 'transient': {
				let value = registration.provider.resolve(context);
				return value;
			}

			// resolve scoped values from the current scope
			// if not found walk up
			case 'scope': {
				let value = this.getScopeValue(lookup, tag);
				if(value) {
					return value;
				}

				value = registration.provider.resolve(context);
				this.setScopeValue(lookup, value, tag);
				return value;
			}
		}
	}

	register(registration: Registration): void {
		registration.id = nextId();
		const lookupKey = getLookupKey(registration.key);
		this.registry.set(lookupKey, registration);
	}

	resolve<TValue = any>(key: ResolveKey<TValue>, tag?: string): TValue {
		const context: ResolveContext = {
			key,
			tag,
			resolve: this.resolve
		}
		const value = this.resolveInner(context);
		if(value === undefined)  {
			throw new ResolveError(`no registration found for key=${valueKeyToString(key)}, tag=${tag}`, {
				key,
				tag
			})
		}

		return value;
	}

	createScope(): TinyContainer {
		return new TinyContainer(this);
	}
}
