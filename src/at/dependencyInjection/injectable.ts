import {type ResolveTarget} from './types';

export function injectable() {
	return <T>(target: ResolveTarget<T>) => undefined;
}
