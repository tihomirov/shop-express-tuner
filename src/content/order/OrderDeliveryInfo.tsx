import { Component, resolve, dependency } from '../../at';
import { Order } from '../../types/order';
import { Copy } from '../copy/Copy';

const flexColumnStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '3px',
}

export class OrderDeliveryInfo extends Component {
  @dependency()
  order?: Order;

  private readonly _deliveryInfo = this.nativeElement('div').style(flexColumnStyle).computedChilds(() => [
    this.nativeElement('span').computedProps(() => ({
      innerText: `Delivery payment method: ${this.order?.delivery.paymentMethod}`
    })),
    this.nativeElement('span').computedProps(() => ({
      innerText: `Delivery payment status: ${this.order?.delivery.paymentStatus}`
    })),
    this.nativeElement('span').computedProps(() => ({
      innerText: `Delivery type: ${this.order?.delivery.type}`
    })),
    this.nativeElement('span').computedProps(() => ({
      innerText: `Delivery address: ${this.order?.delivery.address}`
    })),
    this.component(Copy).props({
      children: [
        this.nativeElement('span').computedProps(() => ({
          innerText: `Delivery city: ${this.order?.delivery.address.split(',')[1]}`
        })),
      ],
      copyValue: this.order?.delivery.address.split(',')[1]
    }),
    this.component(Copy).props({
      children: [
        this.nativeElement('span').computedProps(() => ({
          innerText: `Delivery email: ${this.order?.delivery.email}`
        })),
      ],
      copyValue: this.order?.delivery.email
    }),
    this.component(Copy).props({
      children: [
        this.nativeElement('span').computedProps(() => ({
          innerText: `Delivery phone: ${this.order?.delivery.phone} (${this.order?.delivery.phone.replace(/^\+38/, "").replace(/^38/, "")})`
        })),
      ],
      copyValue: this.order?.delivery.phone.replace(/^\+38/, "").replace(/^38/, "")
    }),
    this.component(Copy).props({
      children: [
        this.nativeElement('span').computedProps(() => ({
          innerText: `Delivery name: ${this.order?.delivery.name}`
        })),
      ],
      copyValue: this.order?.delivery.name
    }),
    this.component(Copy).props({
      children: [
        this.nativeElement('span').computedProps(() => ({
          innerText: `Delivery ttn: ${this.order?.delivery.ttn}`
        })),
      ],
      copyValue: this.order?.delivery.ttn
    }),
  ]);

  childs() {
    return [
      this._deliveryInfo,
    ];
  }
}
