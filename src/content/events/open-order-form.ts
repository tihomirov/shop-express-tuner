import { OpenOrderForm, TabMessageEvent, TabMessageResponse } from '../../common/tab-message';
import { resolve } from '../../at';
import { OrderStore } from '../order/order-store';
import { MessageEvent } from './event';

const elementId = 'ola-order-form';

export class OpenOrderFormEvent extends MessageEvent<OpenOrderForm, TabMessageResponse[TabMessageEvent.OpenOrderForm]> {
  @resolve(OrderStore)
  private readonly _orderStore!: OrderStore;

  run() {
    console.log('[OpenOrderFormEvent] Event Log', this._message);

    this._orderStore.add(this._message.order)

    return undefined
  }
}

// import { OpenOrderForm, TabMessageEvent, TabMessageResponse } from '../../common/tab-message';
// import { Component, resolve, dependency } from '../../at';
// import { Order } from '../../types/order';
// import { OrderStore } from '../order/order-store';
// import { MessageEvent } from './event';

// const elementId = 'ola-order-form';

// export class OpenOrderFormEvent extends MessageEvent<OpenOrderForm, TabMessageResponse[TabMessageEvent.OpenOrderForm]> {
//   @resolve(OrderStore)
//   private readonly _orderStore!: OrderStore;

//   run() {
//     console.log('[OpenOrderFormEvent] Event Log', this._message);

//     document.getElementById(elementId)?.remove();

//     const { order } = this._message

//     const formHtml = `
//         <div style="display: flex;flex-direction: column; gap: 4px;">
//           <span>Client name: ${order.client.name}</span>
//           <span>Client email: ${order.client.email}</span>
//           <span>Client phone: ${order.client.phone}</span>
//           <span>Delivery payment method: ${order.delivery.paymentMethod}</span>
//           <span>Delivery payment status: ${order.delivery.paymentStatus}</span>
//           <span>Delivery type: ${order.delivery.type}</span>
//           <span>Delivery address: ${order.delivery.address}</span>
//           <span>Delivery email: ${order.delivery.email}</span>
//           <span>Delivery phone: ${order.delivery.phone}</span>
//           <span>Delivery name: ${order.delivery.name}</span>
//           <span>Delivery ttn: ${order.delivery.ttn}</span>
//           <ul>
//             ${order.items.map(item => (`
//                 <span>Item name: ${item.name}</span>
//                 <span>Item params: ${item.params}</span>
//                 <span>Item quantity: ${item.quantity}</span>
//                 <span>Item price: ${item.price}</span>
//               `))}
//           </ul>
//         </div>
//       `

//     const wrapperElement = document.createElement('div');
//     wrapperElement.id = elementId;
//     wrapperElement.style.position = 'fixed';
//     wrapperElement.style.width = '400px';
//     wrapperElement.style.zIndex = '999999'
//     wrapperElement.style.right = '10px';
//     wrapperElement.style.top = '10px';
//     wrapperElement.style.fontSize = '12px';
//     wrapperElement.style.backgroundColor = 'lightyellow';
//     wrapperElement.style.borderRadius = '8px';
//     wrapperElement.style.padding = '8px';

//     wrapperElement.innerHTML = formHtml;

//     document.body.appendChild(wrapperElement);

//     return undefined
//   }
// }
