import React, { FC } from "react";
import { Order } from "../../../types/order";

export const OrderForm: FC<{ order: Order }> = ({ order }) => {
  return (
    <div>
      <div style={{ display: "flex", flexDirection: 'row', justifyContent: 'space-between' }}>
        <h3>Total Price: {order.totalPrice}</h3>
        <h3>{order.id}</h3>
      </div>
      <div style={{ display: "flex", flexDirection: 'row', gap: "8px" }}>
        <div>
          <h5>Client</h5>
          <div>{order.client.name}</div>
          <div>{order.client.email}</div>
          <div>{order.client.phone}</div>
        </div>
        <div>
          <h5>Delivery Info</h5>
          <div>{order.delivery.name}</div>
          <div>{order.delivery.email}</div>
          <div>{order.delivery.phone}</div>
          <div>{order.delivery.type}</div>
          <div>{order.delivery.address}</div>
          <div>{order.delivery.paymentMethod}; {order.delivery.paymentStatus}</div>
          <div>{order.delivery.ttn}</div>
        </div>
      </div>


      <div>
        <h5>Items</h5>
        {order.items.map((item, index) => (
          <div key={index} style={{ paddingBottom: '24px' }}>
            <div>{item.name}</div>
            <div>{item.params}</div>

            {
              item.price === item.actualPrice ? (
                <div>{item.actualPrice} X {item.quantity}</div>
              ) : (
                <div><s>{item.price}</s> {item.actualPrice} X {item.quantity}</div>
              )
            }
            <div>Total: {item.totalPrice}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
