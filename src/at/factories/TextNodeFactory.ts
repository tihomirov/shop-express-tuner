import type {TextNodeFactory as NativeElementFactoryType} from '../types';
import {type Observer} from '../observer';
import {resolve} from '../dependencyInjection';
import {observerSymbol} from '../constants';

export class TextNodeFactory implements NativeElementFactoryType {
	@resolve(observerSymbol)
	private readonly _observer!: Observer;

	private readonly _node: Text;

	constructor(textContent: string) {
		this._node = document.createTextNode(textContent);
	}

	getRenderItem(): Text {
		return this._node;
	}

	computedContent(content: ((element: Text) => string)): this {
		const setContent = (textContent: string | undefined) => {
			this._node.textContent = textContent ?? null;
		};

		const contentHandler = () => {
			this._observer.startBatch();
			setContent(content(this._node));
			this._observer.endBatch(contentHandler);
		};

		contentHandler();

		return this;
	}
}
