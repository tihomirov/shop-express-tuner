import {type Typeguard} from './types';

export function assertWithTypeguard<T>(
	value: unknown,
	typeguard: Typeguard<T>,
	msg?: string,
): asserts value is T {
	if (!typeguard(value)) {
		throw new Error('assertWithTypeguard' + (msg ? `: ${msg}` : ''));
	}
}

export function assertExists<T>(x: T, errorMessage: string): asserts x is NonNullable<T> {
	// eslint-disable-next-line no-eq-null, eqeqeq
	if (x == null) {
		throw Error(`assertExists: ${errorMessage}`);
	}
}
