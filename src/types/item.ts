export type Item = Readonly<{
  name?: string;
  params?: string;
  quantity?: number;
  price?: number; // price without discount
  actualPrice?: number; // price with discount, if no discount price is the same with actualPrice
  totalPrice?: number; // quantoty with price with discount 
}>;