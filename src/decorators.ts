import 'reflect-metadata';
import { Class, isConstructor } from './reflection';
import { ResolveKey } from './types';

export type ParameterDecoratorV5 = (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => void;

/**
 * contains the information required to determine
 * how to resolve a class constructor parameter
 */
export interface ParameterInfo {
	/**
	 * parameter position index
	 */
	index: number;

	/**
	 * resolve key to use to resolve a servie value 
	 * and inject the value into this parameter from container
	 */
	key: ResolveKey<any>;

	/**
	 * tag to use when resolving a service value
	 * to inject for this parameter
	 */
	tag?: string;
}

/**
 * contains a mapping of the parameter index position
 * and their parameter resolve information
 */
export interface ParameterList {
	[key: string]: ParameterInfo;
}

/**
 * reflection key use to keep a list of parameter infos objects 
 * for the given class
 */
export const ParameterListKey = Symbol.for('tiny:parameter_list');

/**
 * cache use to prevent rebuilding the parameter information
 * for a class on every request
 */
export const parametersCache = new Map<Class<any>, ParameterInfo[]>();

/**
 * returns the parameter info for a class constructor
 * @param cls class constructor
 * @returns parameter infos list
 */
export function getParameterList(cls: Class<any>): ParameterInfo[] {
	let parameters = parametersCache.get(cls);
	if(parameters) {
		return parameters;
	}

	const parameterTypes: unknown[] = Reflect.getMetadata('design:paramtypes', cls) ?? [];
	const parameterList: ParameterList = Reflect.getOwnMetadata(ParameterListKey, cls) ?? {};

	parameters = parameterTypes.map((type: unknown, index: number) => {
		const parameterInfo = parameterList[index];
		if(parameterInfo) {
			return parameterInfo;
		}

		if(isConstructor(type)) {
			return {
				index: index,
				key: type as Class<any>
			}
		}

		throw new Error(`invalid parameter: cannot resolve parameter type, no @inject() metadata and no constructor info found, class=${cls.name}, parameter_type=${type}, parameter_index=${index}`);
	});

	return parameters;
}

/**
 * class decorator used to tag a class and enable metadata. 
 * this will make the ts compiler attach the design:paramtypes
 * metadata which we will use to get the list of the constructor
 * parameters so we can resolve their service values from the container
 * @returns class decorator
 */
export function register(): ClassDecorator {
	return function(target: unknown): void {}
}

/**
 * parameter decorator used to set parameter resolve information. 
 * this will allow the container to know how this class constructor parameter
 * is supposed to be resolve.
 * @param key resolve key
 * @param tag resolve tag
 * @returns paramter decorator
 */
export function inject(key: ResolveKey<any>, tag?: string): ParameterDecoratorV5 {
	return function(target, propertyKey, parameterIndex): void {
		const parameterList: ParameterList = Reflect.getOwnMetadata(ParameterListKey, target as Object) ?? {};
		const parameterInfo: ParameterInfo = {
			index: parameterIndex,
			key: key,
			tag: tag
		}
		parameterList[parameterIndex] = parameterInfo;
		Reflect.defineMetadata(ParameterListKey, parameterList, target as Object);
	}
}