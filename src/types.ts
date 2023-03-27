import { Class } from './reflection';

/**
 * a string key wrapper that captures the type
 * of the service it can resolve
 */
export interface StringKeyWrapper<TService> {
	type: 'string';
	name: string;
}

/**
 * a symbol key wrapper that capture the type
 * of the service it can resolve
 */
export interface SymbolKeyWrapper<TService> {
	type: 'symbol';
	symbol: Symbol;
}

/**
 * a class key wrapper that captures the type
 * of the service it can resolve
 */
export interface ClassKeyWrapper<TService> {
	type: 'class';
	cls: Class<TService>;
}

/**
 * direct key used to resolve a service in a container,
 * requires manually casting the resolved service into
 * its type
 */
export type LookupKey<TService = any> = string | Symbol | Class<TService>;

/**
 * wrapped key that captures the service type, 
 * when resolving the service, the type will automatically
 * be picked up from the captured type
 */
export type WrappedKey<TService> = StringKeyWrapper<TService> | SymbolKeyWrapper<TService> | ClassKeyWrapper<TService>;

/**
 * a key that can be used to resole services from the container
 */
export type ResolveKey<TService> = WrappedKey<TService> | LookupKey<TService>;

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
	tryResolve<T = any>(key: ResolveKey<T>, tag?: string): T | undefined;

	/**
	 * resolve a service value from the container. 
	 * throws if not found.
	 * @param key resolve key
	 * @param tag resolve tag
	 * @returns service value
	 * @throws if service cannot be resolved
	 */
	resolve<T = any>(key: ResolveKey<T>, tag?: string): T;
}

/**
 * represents a service value lifetime, 
 * single = service is resolved and cached for the lifetime of the container root,
 * request = service is resolved on every resolve request,
 * scope = servie is resolved once per scope and cache for that container scope. 
 */
export type ServiceLifetime = 'single' | 'request' | 'scope';

/**
 * a service resolver fn that given a resolver instance
 * will resolve a service value
 */
export type ServiceResolver = (resolver: Resolver) => any;

/**
 * a service provider object that implements methods
 * to resolve service values using a given resolver
 */
export interface ServiceProvider {
	get(resolver: Resolver): any;
}

/**
 * service registration contains the information
 * that represents an entry in the containers lookup
 * registry. 
 */
export interface ServiceRegistration {
	/**
	 * registration id
	 */
	id: number;

	/**
	 * resolve key used to register the service
	 */
	key: ResolveKey<any>;

	/**
	 * service lifetime
	 */
	lifetime: ServiceLifetime;

	/**
	 * service tag, use to register multiple 
	 * instances of the same type of service
	 * but with different implementations
	 */
	tag?: string;

	/**
	 * service provider, use to resolve the 
	 * service value
	 */
	provider: ServiceProvider;
}