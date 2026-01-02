export type Observer = {
	onDependencySet(instance: unknown, propertyKey: string, value: unknown): void;
	onDependencyGet(instance: unknown, propertyKey: string, value: unknown): void;
	startBatch(): void;
	endBatch(updater: () => void): void;
};
