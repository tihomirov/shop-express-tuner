import type {Childs, RenderItem, Component as ComponentType} from '../types';
import {Component} from '../component';
import type {Renderer} from './types';

const isElement = (value: RenderItem): value is ComponentType => value instanceof Component;

export class DefaultRenderer implements Renderer {
	render(parent: HTMLElement, childs: Childs, previousChilds?: Childs): void {
		if (previousChilds) {
			this.disposeChilds(previousChilds, parent);
		}

		for (const child of childs) {
			const renderItem = child?.getRenderItem();

			if (!renderItem) {
				continue;
			}

			if (isElement(renderItem)) {
				this.render(parent, renderItem.childs());
				continue;
			}

			parent.appendChild(renderItem);
		}
	}

	private disposeChilds(childs: Childs, parent?: HTMLElement) {
		parent?.replaceChildren();

		for (const child of childs) {
			const renderItem = child?.getRenderItem();
			if (renderItem && isElement(renderItem)) {
				renderItem.dispose?.();
			}
		}
	}
}
