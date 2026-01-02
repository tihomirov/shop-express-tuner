import type {Component as ComponentType, Childs} from '../types';
import {ComponentFactory} from '../factories/ComponentFactory';
import {NativeElementFactory} from '../factories/NativeElementFactory';
import {TextNodeFactory} from '../factories/TextNodeFactory';

export abstract class Component implements ComponentType {
	abstract childs(): Childs;

	protected component<T extends ComponentType>(Component: new() => T): ComponentFactory<T> {
		return new ComponentFactory(Component);
	}

	protected nativeElement<K extends keyof HTMLElementTagNameMap>(tagName: K): NativeElementFactory<K, HTMLElementTagNameMap[K]> {
		return new NativeElementFactory(tagName);
	}

	protected textNode(content: string): TextNodeFactory {
		return new TextNodeFactory(content);
	}
}
