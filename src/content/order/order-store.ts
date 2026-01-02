import { dependency, injectable } from '../../at';
import { Order } from '../../types/order';

@injectable()
export class OrderStore {
	@dependency()
	orders: Order[] = [];

	@dependency()
	loading = false;

	add(order: Order): void {
		this.orders = [...this.orders, order];
	}

	remove(id: string): void {
		this.orders = this.orders.filter(order => order.id !== id);
	}
}
