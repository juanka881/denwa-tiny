/**
 * represents a class contructor type
 */
export type Class<T = any> = {
    new(...args: any[]): T;
}

/**
 * checks if a target is a class constructor by checking
 * that the target is function and has a prototype that points
 * to itself as the constructor function
 * @param target value to check
 * @returns true if constructor false otherwise. 
 */
export function isConstructor(target: unknown): boolean {
    return target 
		&& typeof target === 'function' 
		&& target.prototype 
		&& target.prototype.constructor === target;
}

/**
 * checks if a target is a class prototype by checking
 * if its an object and the object's constructor property
 * has a prototype that points itself back to the target
 * @param target target value to check
 * @returns true if is a prototype, false otherwise
 */
export function isPrototype(target: unknown): boolean {
	return target 
		&& typeof target === 'object' 
		&& target.constructor 
		&& typeof target.constructor === 'function' 
		&& target.constructor.prototype
		&& target.constructor.prototype === target;
}

/**
 * gets the constrcutor for a target, where the target 
 * can be a constructor, prototype, or instance.
 * @param target target value to check
 * @returns constructor function
 * @throws if unable to get constructor from target
 */
export function getConstructor(target: Object): Function {
	if(isConstructor(target))  {
		return target as Function;
	}
	else if(isPrototype(target)) {
		return target.constructor;
	}
	else if(target && target.constructor) {
		return target.constructor;
	}
	else {
		throw new Error(`unable to get constructor from target=${target}`);
	}
}

const PARAMETERS_NAMES = /\(([\w, ]+)\)/;

/**
 * get parameter name from function using the
 * parameter index
 * @param fn function
 * @param index parameter index
 * @returns parameter name
 * @throws if the function takes no parameters
 */
export function getParamterName(fn: Function, index: number): string {
	if(fn.length === 0) {
		throw new Error(`invalid parameter: function does not take any parameters`);
	}

	const source = fn.toString();
	const [, names = null] = source.match(PARAMETERS_NAMES) ?? [];

	// unable to match names, return name by index
	if(names === null) {
		return `parameter#${index}`;
	}

	const name = names.split(',')[index].trim();
	return name;
}