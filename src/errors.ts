import { XError } from '@denwa/xerror';
import { Class } from './reflection.js';
import { ResolveKey } from './types.js';

export interface InvalidParameterInfo {
	class_name?: string;
	parameter_name?: string;
	parameter_index?: number;
}

export class InvalidParameterError extends XError<InvalidParameterInfo> {
	constructor(message?: string, info?: InvalidParameterInfo) {
		/* istanbul ignore next */
		super(message ?? 'invalid parameter', info);
		this.retryable = false;
	}
}

export interface InvalidConstructorInfo {
	target: unknown;
}

export class InvalidConstructorError extends XError<InvalidConstructorInfo> {
	constructor(message?: string, info?: InvalidConstructorInfo) {
		/* istanbul ignore next */
		super(message ?? 'invalid constructor', info);
		this.retryable = false;
	}
}

export interface ResolveInfo {
	key: ResolveKey;
	tag?: string;
	class?: Class;
	parameter_name?: string;
	parameter_index?: number;
	parameter_type?: ResolveKey;
}

export class ResolveError extends XError<ResolveInfo> {
	constructor(message?: string, info?: ResolveInfo) {
		/* istanbul ignore next */
		super(message ?? 'resolve failed', info);
	}
}
