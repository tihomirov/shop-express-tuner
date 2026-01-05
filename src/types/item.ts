export type Item = Readonly<{
  name?: string;
  params?: string;
  quantity?: string;
  price?: string; // price without discount
  actualPrice?: string; // price with discount, if no discount price is the same with actualPrice
  totalPrice?: string; // quantoty with price with discount 
}>;