import { Client } from '../../types/client';
import { Delivery } from '../../types/delivery';
import { Item, } from '../../types/item';
import { Order } from '../../types/order';

export function parseOrder(): Order {
  console.log('[ParseOrderEvent] Event Log');
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
      const [_imageUrl, nameWithParams, allPrices, quantity, totalPrice] = [...element.children].map(el => el.textContent.replace(/(\r\n|\n|\r)/gm, '').trim() || el.querySelector('input')?.value);
      const [name, params] = nameWithParams?.split(/\s{2,}/) ?? [];
      const prices = allPrices?.split('₴').map(val => parseFloat(val.trim().replace(',', '.'))).filter(val => val) ?? [];
      const hasDiscount = prices.length > 1;

      return {
        name,
        params,
        quantity: quantity ? parseInt(quantity) : undefined,
        totalPrice: totalPrice ? parseFloat(totalPrice?.trim().replace(',', '.')) : undefined,
        price: prices[0],
        actualPrice: hasDiscount ? prices[1] : prices[0],
      }
    });
  }

  const getTotalPrice = (): number => {
    const regex = /^Всього:\d+,\d{2}₴$/;

    const element = [...document.querySelectorAll("*")].find(el => {
      const normalizedText = el.textContent
        .replace(/\s+/g, ""); // remove spaces + newlines

      return regex.test(normalizedText);
    });

    const priceString = element?.children[2].textContent.replace(',', '.'); // 100,50 -> 100.50(to make parseFloat works)

    return parseFloat(priceString ?? '0')
  }

  return {
    id,
    client: getClient(),
    delivery: getDelivery(),
    items: getItems(),
    totalPrice: getTotalPrice(),
  }
}
