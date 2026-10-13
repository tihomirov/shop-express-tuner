import { Client } from '../../types/client';
import { Delivery } from '../../types/delivery';
import { Item } from '../../types/item';
import { Order } from '../../types/order';

// Like innerText (whitespace collapsed), but also works in jsdom which has no innerText
const getText = (element: Element | null | undefined): string =>
  element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

const optionalText = (element: Element | null | undefined) => getText(element) || undefined;

// "1 990,50 ₴" -> 1990.5
export function parsePrice(text: string | undefined): number | undefined {
  const value = parseFloat(text?.replace(/[\s₴]/g, '').replace(',', '.') ?? '');
  return Number.isNaN(value) ? undefined : value;
}

function parseQuantity(text: string | undefined): number | undefined {
  const value = parseInt(text ?? '', 10);
  return Number.isNaN(value) ? undefined : value;
}

const findSection = (form: HTMLFormElement, title: string) =>
  [...form.querySelectorAll('p')].find(p => getText(p) === title)?.parentElement;

// Section fields are rendered as <p class="se-subheader">Label</p> followed by a <p> with the value.
// Reading by label keeps the other fields correct when the page omits one of them.
function getLabeledValues(section: Element | null | undefined): Map<string, string> {
  const values = new Map<string, string>();
  let label: string | undefined;

  section?.querySelectorAll('p').forEach(p => {
    if (p.classList.contains('se-subheader')) {
      label = getText(p);
    } else if (label !== undefined && !values.has(label)) {
      values.set(label, getText(p));
      label = undefined;
    }
  });

  return values;
}

function getClient(form: HTMLFormElement): Client {
  const section = findSection(form, 'Клієнт');

  return {
    name: optionalText(section?.querySelector('b')),
    phone: optionalText(section?.querySelector('a[href^="tel:"]')),
    email: optionalText(section?.querySelector('a[href^="mailto:"]')),
  };
}

function getDelivery(form: HTMLFormElement): Delivery {
  const delivery = getLabeledValues(findSection(form, 'Доставка'));
  const paymentSection = findSection(form, 'Спосіб оплати');
  const payment = getLabeledValues(paymentSection);

  return {
    type: delivery.get('Доставка'),
    address: delivery.get('Адреса доставки'),
    ttn: delivery.get('Номер накладної (ТТН)'),
    name: delivery.get("Ім'я"),
    email: delivery.get('Email'),
    phone: delivery.get('Телефон'),
    paymentMethod: optionalText(paymentSection?.querySelector('md-select[name="Payment"] md-select-value')),
    paymentStatus: payment.get('Статус оплати'),
  };
}

function getItems(form: HTMLFormElement): Item[] {
  const rows = form.querySelectorAll('tr[ng-repeat="product in Model.Products track by $index"]');

  return [...rows].map(row => {
    const [_image, nameWithParams, allPrices, quantity, totalPrice] = [...row.children].map(
      cell => cell.textContent?.replace(/(\r\n|\n|\r)/gm, '').trim() || cell.querySelector('input')?.value,
    );
    // Name and params are separated by the page markup indentation
    const [name, params] = nameWithParams?.split(/\s{2,}/) ?? [];
    // Discounted items show two prices: "2000 ₴ 1800 ₴"
    const prices = (allPrices?.split('₴') ?? []).map(parsePrice).filter(price => price !== undefined);

    return {
      name,
      params,
      quantity: parseQuantity(quantity),
      totalPrice: parsePrice(totalPrice),
      price: prices[0],
      actualPrice: prices[1] ?? prices[0],
    };
  });
}

function getTotalPrice(form: HTMLFormElement): number | undefined {
  const label = [...form.querySelectorAll('b')].find(b => getText(b) === 'Всього:');
  const row = label?.closest('div');

  return parsePrice(getText(row?.lastElementChild));
}

export function parseOrder(doc: Document = document): Order {
  const form = doc.getElementsByTagName('form')[0];

  if (!form) {
    throw new Error('Order form is not found on this page');
  }

  return {
    id: getText(form.querySelector('h1')).split(' ')[1],
    client: getClient(form),
    delivery: getDelivery(form),
    items: getItems(form),
    totalPrice: getTotalPrice(form),
  };
}
