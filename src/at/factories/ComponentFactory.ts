import {type Observer} from '../observer';
import {resolve} from '../dependencyInjection';
import type {Component, ComponentFactory as ComponentFactoryType} from '../types';
import {observerSymbol} from '../constants';

export class ComponentFactory<T extends Component> implements ComponentFactoryType<T> {
	@resolve(observerSymbol)
	private readonly _observer!: Observer;

	private readonly _component: T;

	constructor(Component: new () => T) {
		this._component = new Component();
	}

	getRenderItem(): T {
		return this._component;
	}

	props(props: Partial<T>): this {
		this.setProps(props);
		return this;
	}

	computedProps(props: (component: T) => Partial<T>): this {
		const propsHandler = () => {
			this._observer.startBatch();
			this.setProps(props(this._component));
			this._observer.endBatch(propsHandler);
		};

		propsHandler();

		return this;
	}

	private setProps(props: Partial<T>): void {
		for (const prop of Object.entries(props)) {
			const key = prop[0] as keyof T;
			const value = prop[1] as T[keyof T];

			this._component[key] = value;
		}
	}
}
