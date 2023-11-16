import { Class } from './reflection';
import { ClassKeyWrapper, StringKeyWrapper, SymbolKeyWrapper, WrappedKey, LookupKey, ResolveKey } from './types';

/**
 * creates a new string key, all string keys match on string value
 * @param name key name
 * @returns string key wrapper
 */
export function stringKey<T>(name: string): StringKeyWrapper<T> {
	return { 
		type: 'string', 
		name
	}
}

/**
 * creates a new symbol key, every symbol key is unique and will
 * only match on the same object reference 
 * @param name key name
 * @returns symbol key wrapper
 */
export function symbolKey<T>(name: string): SymbolKeyWrapper<T> {
	return { 
		type: 'symbol', 
		symbol: Symbol(name)
	};
}

/**
 * creates a new class key, every class key matches on the 
 * constructor function
 * @param cls class constructor
 * @returns class key wrapper
 */
export function classKey<T>(cls: Class<T>): ClassKeyWrapper<T> {
	return { 
		type: 'class', 
		cls: cls
	};
}

/**
 * checks if a target value is a wrapped key
 * @param target target value to check
 * @returns true if its a wrapped key, false otherwise
 */
export function isWrappedKey(target: any): target is WrappedKey<any> {
	if(typeof target === 'object') {
		if(target.type === 'string' && typeof target.name === 'string') {
			return true;
		}

		if(target.type === 'symbol' && typeof target.symbol === 'symbol') {
			return true;
		}

		if(target.type === 'class' && typeof target.cls === 'function') {
			return true;
		}
	}

	return false;
}

/**
 * checks if a target value is a rsolve key
 * @param target target value to check
 * @returns true if its a resolve key, false otherwise
 */
export function isResolveKey(target: any): target is ResolveKey<any> {
	if(typeof target === 'string') {
		return true;
	}
	else if(typeof target === 'function') {
		return true;
	}
	else if(isWrappedKey(target)) {
		return true;
	}

	return false;
}

/**
 * get lookup key from a resolve key
 * @param key resolve key
 * @returns lookup key
 * @throws if the key is not a wrapped key, or lookup key
 */
export function getLookupKey(key: ResolveKey<any>): LookupKey {
	if(isWrappedKey(key)) {
		switch(key.type) {
			case 'string': return key.name;
			case 'symbol': return key.symbol;
			case 'class': return key.cls;
		}
	}
	else if(typeof key === 'string'
		|| typeof key === 'symbol'
		|| typeof key === 'function') {
		return key;
	}
	else {
		throw new Error(`invalid key=${key}`);
	}
}

/**
 * creates a string representation of a resolve key.
 * for string key, returns string($name),
 * for symbol key, returns symbol($name),
 * for class key, returns class($name)
 * @param key resolve key
 * @returns string representation
 */
export function valueKeyToString(key: ResolveKey<any>): string {
	if(isWrappedKey(key)) {
		return valueKeyToString(getLookupKey(key))
	}
	else if(typeof key === 'string') {
		return `string(${key})`;
	}
	else if(typeof key === 'symbol') {
		return `symbol(${key.description})`;
	}
	else if(typeof key === 'function') {
		return `class(${key.name})`;
	}
	else {
		return '';
	}
}