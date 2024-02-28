import 'reflect-metadata';
import { Class, ParameterDecoratorV5, ParameterInfo, getDesignParamerTypes, isConstructor } from './reflection.js';
import { Lifetime, ResolveKey } from './types.js';
import { InvalidConstructorError, InvalidParameterError } from './errors.js';

/**
 * represents the type information
 * used to resolve a parameter in a class constructor
 */
export interface ParameterResolveInfo {
	/**
	 * parameter information
	 */
	parameter: ParameterInfo;

	/**
	 * resolve key
	 */
	key?: ResolveKey;

	/**
	 * resolve tag
	 */
	tag?: string;
}

/**
 * represents the type information
 * used to resolve a class constructor
 * and inject dependencies
 */
export interface ClassResolveInfo {
	/**
	 * class constructor function
	 */
	key: Class;

	/**
	 * list of parameters for constructor
	 */
	parameters: Map<number, ParameterResolveInfo>;

	/**
	 * resolve value lifetime
	 */
	lifetime?: Lifetime;

	/**
	 * resolve value tag
	 */
	tag?: string;
}

/**
 * reflection metadata key used to store the class resolve information
 */
export const CLASS_RESOLVE_INFO = Symbol.for('tiny:class_resolve_info');

/**
 * cache use to prevent rebuilding the constructor information
 * for a class on every request
 */
export const classResolveInfoCache = new Map<Class, ClassResolveInfo>();

/**
 * clear the class resolve info cache
 */
export function clearClassResolveInfoCache(): void {
	classResolveInfoCache.clear();
}

/**
 * gets the class resolve info for a class constructor
 * @param _class class constructor
 */
export function getClassResolveInfo(_class: Class): ClassResolveInfo {
	let classInfo = classResolveInfoCache.get(_class);
	if(classInfo) {
		return classInfo;
	}

	const parameterTypes = getDesignParamerTypes(_class)
	classInfo = {
		key: _class,
		parameters: new Map()
	};

	for(const [index, type] of parameterTypes.entries()) {
		const parameterInfo: ParameterResolveInfo = {
			parameter: {
				index: index,
				type: type
			},
			key: type as ResolveKey,
			tag: undefined
		}
		classInfo.parameters.set(index, parameterInfo);
	}

	classResolveInfoCache.set(_class, classInfo);
	return classInfo;
}

/**
 * decorates a class to be register and automatically resolved
 * from the container.
 */
export function injectable(lifetime?: Lifetime, tag?: string): ClassDecorator {
	return function(target: unknown): void {
		if(!isConstructor(target)) {
			throw new InvalidConstructorError('@injectable() decorator can only be used on class constructors', {
				target
			});
		}

		const classInfo = getClassResolveInfo(target as Class);
		classInfo.lifetime = lifetime;
		classInfo.tag = tag;
	}
}

/**
 * decorates a class to be register and automatically resolved
 * from the container as a single instance.
 */
export function singleton(tag?: string): ClassDecorator {
	return injectable('single', tag);
}

/**
 * decorates a class to be register and automatically resolved
 * from the container scoped to the resolving container.
 */
export function scoped(tag?: string): ClassDecorator {
	return injectable('scope', tag);
}

/**
 * parameter decorator used to set parameter resolve information.
 * this will allow the container to know how this class constructor parameter
 * is supposed to be resolved.
 * @param key resolve key
 * @param tag resolve tag
 * @returns paramter decorator
 */
export function inject(key: ResolveKey<any>, tag?: string): ParameterDecoratorV5 {
	return function(target, propertyKey, parameterIndex): void {
		const classInfo = getClassResolveInfo(target as Class);
		const parameter = classInfo.parameters.get(parameterIndex);
		if(!parameter) {
			throw new InvalidParameterError('parameter index out of range', {
				class_name: target.constructor.name,
				parameter_index: parameterIndex
			});
		}

		parameter.key = key;
		parameter.tag = tag;
	}
}
