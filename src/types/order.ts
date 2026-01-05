import { Client } from './client';
import { Delivery } from './delivery';
import { Item } from './item';

export type Order = Readonly<{
  id: string;
  client: Client;
  delivery: Delivery;
  items: Item[];
  totalPrice: number;
}>;
