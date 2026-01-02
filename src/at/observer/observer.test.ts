import {DefaultObserver} from './observer';
import {type Observer} from './types';

describe('accordion', () => {
	let defaultObserver: Observer;

	beforeEach(() => {
		defaultObserver = new DefaultObserver();
	});

	it('should trigger update when dependency set', () => {
		const dependencyInstance = {};
		const dependencyKey = 'foo';
		const updater = jest.fn();

		defaultObserver.startBatch();
		defaultObserver.onDependencyGet(dependencyInstance, dependencyKey, 1);
		defaultObserver.endBatch(updater);

		defaultObserver.onDependencySet(dependencyInstance, dependencyKey, 2);
		defaultObserver.onDependencySet(dependencyInstance, dependencyKey, 3);

		expect(updater).toHaveBeenCalledTimes(2);
		updater.mockReset();

		defaultObserver.onDependencySet(dependencyInstance, dependencyKey, 1);
		expect(updater).toHaveBeenCalledTimes(1);
	});

	it('should trigger once when get dependency several times', () => {
		const dependencyInstance = {};
		const dependencyKey = 'foo';
		const updater = jest.fn();

		defaultObserver.startBatch();
		defaultObserver.onDependencyGet(dependencyInstance, dependencyKey, 1);
		defaultObserver.onDependencyGet(dependencyInstance, dependencyKey, 1);
		defaultObserver.onDependencyGet(dependencyInstance, dependencyKey, 1);
		defaultObserver.endBatch(updater);

		defaultObserver.onDependencySet(dependencyInstance, dependencyKey, 2);

		expect(updater).toHaveBeenCalledTimes(1);
	});

	it('should handle correct set when bbatch is in progress', () => {
		const dependencyInstance = {};
		const dependencyKey = 'foo';
		const updater = jest.fn();

		defaultObserver.startBatch();
		defaultObserver.onDependencyGet(dependencyInstance, dependencyKey, 1);
		defaultObserver.onDependencySet(dependencyInstance, dependencyKey, 2);
		defaultObserver.endBatch(updater);

		defaultObserver.onDependencySet(dependencyInstance, dependencyKey, 3);

		expect(updater).toHaveBeenCalledTimes(1);
	});

	it('should not trigger update when dependency set with the same value', () => {
		const dependencyInstance = {};
		const dependencyKey = 'foo';
		const updater = jest.fn();

		defaultObserver.startBatch();
		defaultObserver.onDependencyGet(dependencyInstance, dependencyKey, 1);
		defaultObserver.endBatch(updater);

		defaultObserver.onDependencySet(dependencyInstance, dependencyKey, 1);

		expect(updater).not.toHaveBeenCalled();
	});

	it('should handle several batches recursively', () => {
		const dependencyInstance1 = {};
		const dependencyInstance2 = {};
		const dependencyKey1 = 'foo1';
		const dependencyKey2 = 'foo2';
		const updater1 = jest.fn();
		const updater2 = jest.fn();

		defaultObserver.startBatch();
		defaultObserver.onDependencyGet(dependencyInstance1, dependencyKey1, 1);

		defaultObserver.startBatch();
		defaultObserver.onDependencyGet(dependencyInstance2, dependencyKey2, 'value');
		defaultObserver.endBatch(updater2);

		defaultObserver.endBatch(updater1);

		defaultObserver.onDependencySet(dependencyInstance1, dependencyKey1, 2);

		expect(updater1).toHaveBeenCalled();
		expect(updater2).not.toHaveBeenCalled();

		updater1.mockReset();
		updater2.mockReset();

		defaultObserver.onDependencySet(dependencyInstance2, dependencyKey2, 'value2');

		expect(updater1).not.toHaveBeenCalled();
		expect(updater2).toHaveBeenCalled();
	});
});
