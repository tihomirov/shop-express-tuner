import { Order } from '../types/order';
import { isEnum, isNonArrayObject } from '../utils/is-it';

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
  [TabMessageEvent.OpenOrderForm]: void;
};

const isTabMessageEvent = isEnum(TabMessageEvent);

// Every extension message reaches every listener, so only handle messages that are ours
export const isTabMessage = (message: unknown): message is TabMessage =>
  isNonArrayObject(message) && isTabMessageEvent(message.event);
