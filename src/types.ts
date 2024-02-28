import { Class } from './reflection.js';

/**
 * a string key wrapper that captures the type
 * of the service it can resolve
 */
export interface StringKeyWrapper<TValue> {
	type: 'string';
	name: string;
}

/**
 * a symbol key wrapper that capture the type
 * of the service it can resolve
 */
export interface SymbolKeyWrapper<TValue> {
	type: 'symbol';
	symbol: Symbol;
}

/**
 * a class key wrapper that captures the type
 * of the service it can resolve
 */
export interface ClassKeyWrapper<TValue> {
	type: 'class';
	cls: Class<TValue>;
}

/**
 * direct key used to resolve a service in a container,
 * requires manually casting the resolved service into
 * its type
 */
export type LookupKey<TValue = any> = string | Symbol | Class<TValue>;

/**
 * wrapped key that captures the service type,
 * when resolving the service, the type will automatically
 * be picked up from the captured type
 */
export type WrappedKey<TValue = any> = StringKeyWrapper<TValue> | SymbolKeyWrapper<TValue> | ClassKeyWrapper<TValue>;

/**
 * a key that can be used to resole services from the container
 */
export type ResolveKey<TValue = any> = WrappedKey<TValue> | LookupKey<TValue>;

/**
 * interface use to allow a service resolver to rsolve
 * values
 */
export interface Resolver {
	/**
	 * resolve a service value from the container.
	 * throws if not found.
	 * @param key resolve key
	 * @param tag resolve tag
	 * @returns service value
	 * @throws if service cannot be resolved
	 */
	resolve<TValue = any>(key: ResolveKey<TValue>, tag?: string): TValue;
}

/**
 * represents a container instance
 */
export interface Container extends Resolver {
	/**
	 * create a new child container scope
	 */
	createScope(): Container;
}

/**
 * represents a value lifetime,
 * transient = value is always resolved.
 * scope = value is resolved once per scope and cache for that container scope.
 * single = value is resolved and cached for the lifetime of the container root.
 */
export type Lifetime = 'transient' | 'scope' | 'single';

/**
 * a value resolver fn that given a resolver instance
 * will resolve a desired value
 */
export type ResolveCallback<TValue = any> = (context: ResolveContext) => TValue;

/**
 * represents context used during
 * value resolution.
 */
export interface ResolveContext extends Resolver {
	/**
	 * key being resolved
	 */
	key: ResolveKey;

	/**
	 * resolve tag
	 */
	tag?: string;
}

/**
 * a value provider object that implements methods
 * to resolve service values using a given resolver
 */
export interface Provider<TValue = any> {
	resolve: ResolveCallback<TValue>;
}

/**
 * value registration contains the information
 * that represents an entry in the containers lookup
 * registry.
 */
export interface Registration {
	/**
	 * registration id
	 */
	id: number;

	/**
	 * resolve key used to register the service
	 */
	key: ResolveKey<any>;

	/**
	 * value lifetime
	 */
	lifetime: Lifetime;

	/**
	 * value tag, use to register multiple
	 * instances of the same type of value
	 * but with different values
	 */
	tag?: string;

	/**
	 * value provider
	 */
	provider: Provider;
}
