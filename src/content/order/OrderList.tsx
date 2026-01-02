import { Component, resolve } from '../../at';
import { OrderStore } from './order-store';
import { OrderForm } from './OrderForm';

export class OrderList extends Component {
	@resolve(OrderStore)
	private readonly _orderStore!: OrderStore;

	private readonly _containerElement = this.nativeElement('div')
		.computedChilds(() => this._orderStore.orders.map(order => this.component(OrderForm).props({ order })));

	childs() {
		return [
			this._containerElement,
		];
	}
}
