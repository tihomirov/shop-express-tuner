import browser from 'webextension-polyfill';

import { Component } from '../at';
import { assertUnreachable } from '../utils/assert';
import { TabMessage, TabMessageEvent, TabMessageResponse } from '../common/tab-message';
import { ParseOrderEvent, OpenOrderFormEvent, MessageEvent } from './events';
import { OrderList } from './order/OrderList';

export class App extends Component {
	constructor() {
		super();

		browser.runtime.onMessage.addListener(this.onTabMessage);
	}

	dispose() {
		browser.runtime.onMessage.removeListener(this.onTabMessage);
	}

	onTabMessage: browser.Runtime.OnMessageListener = (message: any, _sender, sendResponse) => {
		const event = mapMessageToEvent(message);

		if (!event) {
			return true;
		}

		const response = event.run();
		sendResponse(response);

		return true;
	}

	private readonly _containerElement = this.nativeElement('div').style({
		position: 'absolut',
	});

	private readonly _orderListComponent = this.component(OrderList);

	childs() {
		return [
			this._containerElement.childs([
				this._orderListComponent,
			]),
		];
	}
}



function mapMessageToEvent(message: TabMessage): MessageEvent<TabMessage, TabMessageResponse[TabMessageEvent]> {
	const event = message.event;

	switch (event) {
		case TabMessageEvent.ParseOrder:
			return new ParseOrderEvent(message);
		case TabMessageEvent.OpenOrderForm:
			return new OpenOrderFormEvent(message);
		default:
			assertUnreachable(event);
	}
}
