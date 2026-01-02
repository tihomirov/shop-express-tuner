
import 'reflect-metadata';

import {type Renderer, DefaultRenderer} from './renderer';
import {DefaultObserver} from './observer';
import {Injector} from './dependencyInjection';
import {ComponentFactory} from './factories/ComponentFactory';
import {type Component} from './types';
import {rendererSymbol, observerSymbol} from './constants';

export class At {
	static init(rootElement: HTMLDivElement): Pick<At, 'render'> {
		const instance = new At(rootElement);

		return instance;
	}

	private constructor(private readonly _rootElement: HTMLDivElement) {
		Injector.bind(rendererSymbol, DefaultRenderer);
		Injector.bind(observerSymbol, DefaultObserver);
	}

	render(Component: new() => Component): void {
		const componentFactory = new ComponentFactory(Component);

		const renderer = Injector.resolve<Renderer>(rendererSymbol);
		renderer.render(this._rootElement, [componentFactory]);
	}
}
