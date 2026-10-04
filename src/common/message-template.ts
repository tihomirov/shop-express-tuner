import { Order } from '../types/order';

type Placeholder = Readonly<{
  key: string;
  description: string;
  getValue: (order: Order) => string | number | undefined;
}>;

// Delivery name comes from the page as "<last name> <first name> ..."
const getNamePart = (order: Order, index: number) => order.delivery.name?.split(' ')[index];

export const MESSAGE_PLACEHOLDERS: ReadonlyArray<Placeholder> = [
  { key: 'firstName', description: 'Recipient first name', getValue: (order) => getNamePart(order, 1) },
  { key: 'lastName', description: 'Recipient last name', getValue: (order) => getNamePart(order, 0) },
  { key: 'fullName', description: 'Recipient full name', getValue: (order) => order.delivery.name },
  { key: 'ttn', description: 'Delivery TTN', getValue: (order) => order.delivery.ttn },
  { key: 'orderId', description: 'Order number', getValue: (order) => order.id },
  { key: 'total', description: 'Order total price', getValue: (order) => order.totalPrice },
  { key: 'phone', description: 'Recipient phone', getValue: (order) => order.delivery.phone },
  { key: 'city', description: 'Delivery city', getValue: (order) => order.delivery.address?.split(',')[1]?.trim() },
];

export function renderMessageTemplate(template: string, order: Order): string {
  return MESSAGE_PLACEHOLDERS.reduce(
    (message, { key, getValue }) => message.split(`{${key}}`).join(String(getValue(order) ?? '')),
    template,
  );
}
