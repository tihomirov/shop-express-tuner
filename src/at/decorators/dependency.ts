import {Injector} from '../dependencyInjection';
import {type Observer} from '../observer';
import {observerSymbol} from '../constants';

export function dependency<T>() {
	return function (target: unknown, propertyKey: string) {
		const privatePropKey = Symbol('privatePropKey');

		Object.defineProperty(target, propertyKey, {
			get(this) {
				const value = this[privatePropKey] as T;

				const observer = Injector.resolve<Observer>(observerSymbol);
				observer.onDependencyGet(this, propertyKey, value);

				return value;
			},
			set(newValue: T) {
				this[privatePropKey] = newValue;

				const observer = Injector.resolve<Observer>(observerSymbol);
				observer.onDependencySet(this, propertyKey, newValue);
			},
		});
	};
}
