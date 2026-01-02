import {type Typeguard} from './types';

export type PlainObject = Record<string, unknown>;
export function isObject(item: unknown): item is PlainObject | readonly unknown[] {
	return item !== null && typeof item === 'object';
}

export function isNonArrayObject(item: unknown): item is NonNullable<PlainObject> {
	return isObject(item) && !Array.isArray(item);
}

export function isPromise(value: unknown): value is PromiseLike<unknown> {
	return isNonArrayObject(value) && typeof value.subscribe !== 'function' && typeof value.then === 'function';
}

export function isInteger(num: unknown): num is number {
	return typeof num === 'number' && Number.isInteger(num);
}

/**
 * Type guard (also great for `filter` operations), that doesn't like `undefined` or `null` values
 */
export function isSomething<T>(x: T | undefined): x is NonNullable<T> {
	// eslint-disable-next-line no-eq-null, eqeqeq
	return x != null;
}

export function isNothing<T>(x: T): x is Exclude<T, NonNullable<T>> {
	// eslint-disable-next-line no-eq-null, eqeqeq
	return x == null;
}

export function isEmpty<T>(collection: Iterable<T> | undefined): boolean {
// eslint-disable-next-line no-eq-null, eqeqeq
	if (collection == null) {
		return true;
	}

	const iterator = collection[Symbol.iterator]();
	return iterator.next().done === true;
}

export const isFunction = (item: unknown): item is () => unknown => typeof item === 'function';
export const isString = (item: unknown): item is string => typeof item === 'string';
export const isNumber = (item: unknown): item is number => typeof item === 'number';
export const isBoolean = (item: unknown): item is boolean => typeof item === 'boolean';
export const isPrimitive = (item: unknown): item is boolean | string | number =>
	isBoolean(item) || isString(item) || isNumber(item);

export function simpleTypeguard<T>(
	...properties: Array<keyof T | [keyof T, (value: unknown) => boolean, boolean?]>
): Typeguard<T> {
	return (object: unknown): object is T =>
		isNonArrayObject(object) && properties.every(prop => {
			if (Array.isArray(prop)) {
				const [name, validator, optional = false] = prop;
				const value = object[name as string];
				return isSomething(value) ? validator(value) : optional;
			}

			return prop in object;
		});
}
