export function last<T>(arr: readonly T[]): T | undefined {
	const {length} = arr;
	return length > 0 ? arr[length - 1] : undefined;
}
