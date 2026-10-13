export type Item = Readonly<{
  name?: string;
  params?: string;
  quantity?: number;
  price?: number; // price without discount
  actualPrice?: number; // price with discount, equals price when there is no discount
  totalPrice?: number; // quantity * actualPrice
}>;
