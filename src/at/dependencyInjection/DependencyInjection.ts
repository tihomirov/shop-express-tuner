import {type ResolveTarget} from './types';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Injector {
	static resolve<T>(Target: ResolveTarget<T> | symbol): T {
		if (typeof Target === 'symbol') {
			const target = Injector.container.get(Target) as T;

			if (!target) {
				throw new Error(`can not resolve by symol${Target.toString()}`);
			}

			return target;
		}

		if (Injector.container.has(Target.name)) {
			return Injector.container.get(Target.name) as T;
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const tokens: ReadonlyArray<ResolveTarget<any>> = Reflect.getMetadata('design:paramtypes', Target) || [];
		const injections = tokens.map((token: ResolveTarget<T>): T => Injector.resolve(token));
		const instance = new Target(...injections);

		Injector.container.set(Target.name, instance);

		return instance;
	}

	static bind<T>(symbol: symbol, Target: ResolveTarget<T>): void {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const tokens: ReadonlyArray<ResolveTarget<any>> = Reflect.getMetadata('design:paramtypes', Target) || [];
		const injections = tokens.map((token: ResolveTarget<T>): T => Injector.resolve(token));
		const instance = new Target(...injections);

		Injector.container.set(symbol, instance);
	}

	private static readonly container = new Map<string | symbol, any>();
}
