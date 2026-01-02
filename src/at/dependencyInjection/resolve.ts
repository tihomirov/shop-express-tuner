import {type ResolveTarget} from './types';
import {Injector} from './DependencyInjection';

export function resolve<T>(ResolveTarget: ResolveTarget<T> | symbol) {
	return function <T>(target: unknown, propertyKey: string) {
		Object.defineProperty(target, propertyKey, {
			get() {
				return Injector.resolve(ResolveTarget);
			},
			set() {
				throw new Error('can not set value to @resolve property');
			},
		});
	};
}
