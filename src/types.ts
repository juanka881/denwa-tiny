import { Class } from './reflection';

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
export type WrappedKey<TValue> = StringKeyWrapper<TValue> | SymbolKeyWrapper<TValue> | ClassKeyWrapper<TValue>;

/**
 * a key that can be used to resole services from the container
 */
export type ResolveKey<TValue> = WrappedKey<TValue> | LookupKey<TValue>;

/**
 * interface use to allow a service resolver to rsolve
 * values
 */
export interface Resolver {
	/**
	 * try to resolve a service value from the container.
	 * @param key resolve key
	 * @param tag resolve tag
	 * @returns service value if resolved, undefined otherwise
	 */
	tryResolve<TValue = any>(key: ResolveKey<TValue>, tag?: string): TValue | undefined;

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
 * represents a value lifetime, 
 * single = value is resolved and cached for the lifetime of the container root,
 * request = value is resolved on every resolve request,
 * scope = value is resolved once per scope and cache for that container scope. 
 */
export type ValueLifetime = 'single' | 'request' | 'scope';

/**
 * a value resolver fn that given a resolver instance
 * will resolve a desired value
 */
export type ValueResolver = (resolver: Resolver) => any;

/**
 * a value provider object that implements methods
 * to resolve service values using a given resolver
 */
export interface ValueProvider {
	get(resolver: Resolver): any;
}

/**
 * value registration contains the information
 * that represents an entry in the containers lookup
 * registry. 
 */
export interface ValueRegistration {
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
	lifetime: ValueLifetime;

	/**
	 * value tag, use to register multiple 
	 * instances of the same type of value
	 * but with different values
	 */
	tag?: string;

	/**
	 * value provider
	 */
	provider: ValueProvider;
}