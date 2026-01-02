import { Order } from '../types/order';

export enum TabMessageEvent {
  ParseOrder = 'OLA_PARSE_ORDER',
  OpenOrderForm = 'OLA_OPEN_ORDER_FORM_EVENT',
}

export type ParseOrder = Readonly<{
  event: TabMessageEvent.ParseOrder;
}>;

export type OpenOrderForm = Readonly<{
  event: TabMessageEvent.OpenOrderForm;
  order: Order;
}>;

export type TabMessage = ParseOrder | OpenOrderForm;

export type TabMessageResponse = {
  [TabMessageEvent.ParseOrder]: Order;
  [TabMessageEvent.OpenOrderForm]: undefined;
};
