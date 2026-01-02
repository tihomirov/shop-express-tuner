export type Delivery = Readonly<{
  type: string;
  address: string;
  ttn: string;
  name: string;
  email: string;
  phone: string;
  paymentMethod: string;
  paymentStatus: string;
}>