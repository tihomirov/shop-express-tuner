import { renderMessageTemplate } from "../common/message-template";
import { Order } from "../types/order";

const order: Order = {
  id: '777',
  client: { name: 'Client', phone: '', email: '' },
  delivery: {
    type: 'Нова Пошта',
    address: 'Україна, Львів, Відділення №5',
    ttn: '20450011112222',
    name: 'Коваленко Марія',
    email: 'maria@example.com',
    phone: '+380671112233',
    paymentMethod: 'Накладений платіж',
    paymentStatus: '',
  },
  items: [],
  totalPrice: 990,
};

test("replaces all placeholders", () => {
  expect(renderMessageTemplate('{firstName} {lastName} | {fullName} | {ttn} | {orderId} | {total} | {phone} | {city}', order))
    .toBe('Марія Коваленко | Коваленко Марія | 20450011112222 | 777 | 990 | +380671112233 | Львів');
});

test("replaces repeated placeholders and keeps unknown ones", () => {
  expect(renderMessageTemplate('{ttn} {ttn} {unknown}', order)).toBe('20450011112222 20450011112222 {unknown}');
});

test("renders missing values as empty string", () => {
  const noTtn = { ...order, delivery: { ...order.delivery, ttn: undefined as unknown as string } };
  expect(renderMessageTemplate('ТТН {ttn}!', noTtn)).toBe('ТТН !');
});
