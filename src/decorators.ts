import 'reflect-metadata';
import { Class, isConstructor } from './reflection';
import { ResolveKey } from './types';

/**
 * contains the information required to determine
 * how to resolve a class constructor parameter
 */
export interface ParameterInfo {
	/**
	 * parameter position index
	 */
	parameterIndex: number;

	/**
	 * resolve key to use to resolve a servie value 
	 * and inject the value into this parameter from container
	 */
	resolveKey: ResolveKey<any>;

	/**
	 * tag to use when resolving a service value
	 * to inject for this parameter
	 */
	resolveTag?: string;
}

/**
 * contains a mapping of the parameter index position
 * and their parameter resolve information
 */
export interface ParametersInfo {
	[key: string]: ParameterInfo;
}

/**
 * reflection key use to keep a list of parameter infos objects 
 * for the given class
 */
export const ParameterInfosKey = Symbol.for('container:parameterInfos');

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
export function getParameterInfos(cls: Class<any>): ParameterInfo[] {
	let parameters = parametersCache.get(cls);
	if(parameters) {
		return parameters;
	}

	const parameterTypes: unknown[] = Reflect.getMetadata('design:paramtypes', cls) ?? [];
	const parameterInfos: ParametersInfo = Reflect.getOwnMetadata(ParameterInfosKey, cls) ?? {};

	parameters = parameterTypes.map((type: unknown, index: number) => {
		const parameterInfo = parameterInfos[index];
		if(parameterInfo) {
			return parameterInfo;
		}

		if(isConstructor(type)) {
			return {
				parameterIndex: index,
				resolveKey: type as Class<any>
			}
		}

		throw new Error(`invalid parameter: cannot resolve parameter type, no @inject() metadata and no constructor info found, class=${cls.name}, parameterType=${type}, parameterindex=${index}`);
	});

	return parameters;
}

/**
 * class decorator, use to tag a class as a service
 * this will make the ts compiler attach the design:paramtypes
 * metadata which we will use to get the list of the constructor
 * parameters so we can resolve their service values from the container
 * @returns class decorator
 */
export function service(): ClassDecorator {
	return function(target: unknown): void {}
}

export function inject(key: ResolveKey<any>, tag?: string): ParameterDecorator {
	return function(target: unknown, propertyKey: string | Symbol, parameterIndex: number): void {
		const parameterInfos: ParametersInfo = Reflect.getOwnMetadata(ParameterInfosKey, target as Object) ?? {};
		const parameterInfo: ParameterInfo = {
			parameterIndex,
			resolveKey: key,
			resolveTag: tag
		}
		parameterInfos[parameterIndex] = parameterInfo;
		Reflect.defineMetadata(ParameterInfosKey, parameterInfos, target as Object);
	}
}