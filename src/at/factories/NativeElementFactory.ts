import {type Renderer} from '../renderer';
import {type Observer} from '../observer';
import type {Childs, NativeElementFactory as NativeElementFactoryType} from '../types';
import {rendererSymbol, observerSymbol} from '../constants';
import {resolve} from '../dependencyInjection';

export class NativeElementFactory<K extends keyof HTMLElementTagNameMap, E extends HTMLElementTagNameMap[K]> implements NativeElementFactoryType<K, E> {
	@resolve(rendererSymbol)
	private readonly _renderer!: Renderer;

	@resolve(observerSymbol)
	private readonly _observer!: Observer;

	private readonly _element: E;

	constructor(tagName: K) {
		this._element = document.createElement(tagName) as E;
	}

	getRenderItem(): E {
		return this._element;
	}

	props(props: Partial<E>): this {
		this.setProps(props);
		return this;
	}

	computedProps(props: (element: E) => Partial<E>): this {
		const propsHandler = () => {
			this._observer.startBatch();
			this.setProps(props(this._element));
			this._observer.endBatch(propsHandler);
		};

		propsHandler();

		return this;
	}

	style(style: Partial<CSSStyleDeclaration>): this {
		this.setStyle(style);
		return this;
	}

	computedStyle(style: (element: E) => Partial<CSSStyleDeclaration>): this {
		const stylesHandler = () => {
			this._observer.startBatch();
			this.setStyle(style(this._element));
			this._observer.endBatch(stylesHandler);
		};

		stylesHandler();

		return this;
	}

	childs(childs: Childs): this {
		this._renderer.render(this._element, childs);
		return this;
	}

	computedChilds(childs: (element: E, prevChilds?: Childs) => Childs): this {
		let prevChilds: Childs | undefined;

		const createChildElements = (): void => {
			this._observer.startBatch();
			const childElements = childs(this._element, prevChilds);
			this._observer.endBatch(createChildElements);

			if (childElements === prevChilds) {
				return;
			}

			if (childElements) {
				this._renderer.render(this._element, childElements, prevChilds);
			}

			prevChilds = childElements;
		};

		createChildElements();

		return this;
	}

	private setProps(props: Partial<E>): void {
		for (const prop of Object.entries(props)) {
			const key = prop[0] as keyof E;
			const value = prop[1] as E[keyof E];

			this._element[key] = value;
		}
	}

	private setStyle(style: Partial<CSSStyleDeclaration>): void {
		Object.assign(this._element.style, style);
	}
}
