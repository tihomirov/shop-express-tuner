import { ParseOrder, TabMessageEvent, TabMessageResponse } from '../../common/tab-message';
import { Client } from '../../types/client';
import { Delivery } from '../../types/delivery';
import { Item } from '../../types/item';
import { MessageEvent } from './event';

export class ParseOrderEvent extends MessageEvent<ParseOrder, TabMessageResponse[TabMessageEvent.ParseOrder]> {
  run() {
    console.log('[ParseOrderEvent] Event Log', this._message);
    const mainOrderFormElement = document.getElementsByTagName('form')[0];

    if (!mainOrderFormElement) {
      throw new Error('Conteiner element is not found. Can not parse order')
    }

    const id = mainOrderFormElement.querySelector('h1')?.innerText?.split(' ')[1]!;

    const getClient = (): Client => {
      const clientContainerElement = [...mainOrderFormElement.querySelectorAll('p')].filter(p => p?.innerText === 'Клієнт')?.[0]?.parentElement;
      const [_label, name, phone, email] = [...clientContainerElement?.querySelectorAll<HTMLParagraphElement>('div p') ?? []].map(p => p?.innerText)
      return { name, phone, email };
    }

    const getDelivery = (): Delivery => {
      const deliveryContainerElement = [...mainOrderFormElement.querySelectorAll('p')].filter(p => p?.innerText === 'Доставка')?.[0]?.parentElement;
      const delivery = ([...deliveryContainerElement?.querySelectorAll('p') ?? []]).map(p => p?.innerText);
      const paymentContainerElement = [...mainOrderFormElement.querySelectorAll('p')].filter(p => p?.innerText === 'Спосіб оплати')?.[0]?.parentElement;
      const payment = ([...paymentContainerElement?.querySelectorAll<HTMLParagraphElement | HTMLSpanElement>('p, span') ?? []]).map(p => p?.innerText);

      return {
        type: delivery[1],
        address: delivery[3],
        ttn: delivery[5],
        name: delivery[7],
        email: delivery[9],
        phone: delivery[11],
        paymentMethod: payment[1],
        paymentStatus: payment[4],
      }
    }

    const getItems = (): Item[] => {
      const itemsElements = mainOrderFormElement.querySelectorAll('tr[ng-repeat="product in Model.Products track by $index"]')

      return [...itemsElements].map(element => {
        const item = [...element.querySelectorAll<HTMLElement>('b, span, p')].map(a => a.innerText);
        const quantity = element.querySelector('input')?.value!;

        return {
          name: item[1],
          params: item[2],
          price: item[6],
          quantity: parseInt(quantity),
        }
      });
    }

    return {
      id,
      client: getClient(),
      delivery: getDelivery(),
      items: getItems(),
    }
  }
}
