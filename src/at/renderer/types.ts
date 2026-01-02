import type {Childs} from '../types';

export type Renderer = {
	render: (node: HTMLElement, childs: Childs, previousChilds?: Childs) => void;
};
