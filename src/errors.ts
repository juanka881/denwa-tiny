import { XError } from '@denwa/xerror';
import { Class } from './reflection.js';
import { ResolveKey } from './types.js';

export interface InvalidParameterDetail {
	class_name?: string;
	parameter_name?: string;
	parameter_index?: number;
}

export class InvalidParameterError extends XError<InvalidParameterDetail> {
	constructor(message?: string, detail?: InvalidParameterDetail) {
		/* istanbul ignore next */
		super(message ?? 'invalid parameter', detail);
		this.transient = false;
	}
}

export interface InvalidConstructorDetail {
	target: unknown;
}

export class InvalidConstructorError extends XError<InvalidConstructorDetail> {
	constructor(message?: string, detail?: InvalidConstructorDetail) {
		/* istanbul ignore next */
		super(message ?? 'invalid constructor', detail);
		this.transient = false;
	}
}

export interface ResolveDetail {
	key: ResolveKey;
	tag?: string;
	class?: Class;
	parameter_name?: string;
	parameter_index?: number;
	parameter_type?: ResolveKey;
}

export class ResolveError extends XError<ResolveDetail> {
	constructor(message?: string, detail?: ResolveDetail) {
		/* istanbul ignore next */
		super(message ?? 'resolve failed', detail);
	}
}
