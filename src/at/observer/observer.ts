import {last} from '../core/collections';
import {assertExists} from '../core/assert';
import type {Observer} from './types';

type Instance = unknown;
type ProperyKey = string;
type ProperyValue = unknown;
type Updater = () => void;

type PropertyDependencies = Map<Updater, ProperyValue>;
type InstanceDependencies = Map<ProperyKey, PropertyDependencies>;
type ObserverDependencies = Map<Instance, InstanceDependencies>;

type Batch = Map<Instance, Map<string, unknown>>;

export class DefaultObserver implements Observer {
	private readonly _dependencies: ObserverDependencies = new Map();
	private readonly _batches: Batch[] = [];

	onDependencySet(instance: unknown, propertyKey: string, value: unknown): void {
		this._dependencies.get(instance)?.get(propertyKey)?.forEach((lastValue, updater, map) => {
			if (value !== lastValue) {
				updater();
				map.set(updater, value);
			}
		});
	}

	onDependencyGet(instance: unknown, propertyKey: string, value: unknown) {
		const lastBatch = last(this._batches);

		if (!lastBatch) {
			return;
		}

		const instanceDependencies = lastBatch.get(instance);

		if (instanceDependencies) {
			instanceDependencies.set(propertyKey, value);
		} else {
			lastBatch.set(instance, new Map([[propertyKey, value]]));
		}
	}

	startBatch(): void {
		this._batches.push(new Map());
	}

	endBatch(updater: () => void): void {
		const batch = this._batches.pop();

		assertExists(batch, 'Batch is not found in endBatch');

		batch?.forEach((dependencies, instance) => {
			dependencies.forEach((value, propertyKey) => {
				const instanceDependencies = this._dependencies.get(instance);

				if (!instanceDependencies) {
					this._dependencies.set(instance, new Map([
						[propertyKey, new Map([[updater, value]])],
					]));
					return;
				}

				const propertyDependencies = instanceDependencies.get(propertyKey);

				if (!propertyDependencies) {
					instanceDependencies.set(propertyKey, new Map([[updater, value]]));
					return;
				}

				propertyDependencies.set(updater, value);
			});
		});
	}
}
