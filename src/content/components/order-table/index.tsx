import React, { FC, useCallback, useRef, useMemo } from "react";
import { Order } from "../../../types/order";
import { Item } from "../../../types/item";
import {
  expandItemsByQuantity,
  formatDate,
  formatPhone,
  getCity,
  getItemColor,
  getItemDiscount,
  getItemShortName,
  getItemSize,
  getPaymentType,
  getReceivedPayment,
} from "../../../common/order-format";

const tdCommonStyle: React.CSSProperties = {
  border: '1px solid rgb(0, 0, 0)',
  verticalAlign: 'middle',
  textAlign: 'center',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'rgb(0, 0, 0) rgb(0, 0, 0) rgb(0, 0, 0) rgb(204, 204, 204)',
  borderImage: 'initial',
  overflow: 'hidden',
  padding: '2px 3px',
};

const tableStyle: React.CSSProperties = {
  tableLayout: 'fixed',
  fontSize: '10pt',
  fontFamily: 'Arial',
  borderCollapse: 'collapse',
  border: 'none'
};

type OrderTableProps = {
  order: Order,
}

// An order without parsed items still gets one row with the client and delivery data
const EMPTY_ITEM: Item = {};

export const OrderTable: FC<OrderTableProps> = ({ order }) => {
  const tableRef = useRef<HTMLTableElement>(null);

  const todayString = useMemo(() => formatDate(new Date()), []);
  const phoneFormatted = formatPhone(order.delivery.phone);
  const city = getCity(order.delivery.address);
  const paymentType = getPaymentType(order.delivery.paymentMethod);
  const receivedPayment = getReceivedPayment(order.totalPrice, paymentType);

  const copyTable = useCallback(async () => {
    try {
      if (!tableRef.current) {
        throw new Error(`Table element is missing`);
      }

      // Copy both HTML (keeps the cells when pasting into a spreadsheet) and plain text
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([tableRef.current.outerHTML], { type: 'text/html' }),
        'text/plain': new Blob([tableRef.current.innerText], { type: 'text/plain' }),
      });

      await navigator.clipboard.write([clipboardItem]);
    } catch (err) {
      console.error('Failed to copy table: ', err);
    }
  }, []);

  const copyValue = useCallback((value: string | number | undefined) => {
    if (!value) {
      return
    }
    navigator.clipboard.writeText(value.toString());
  }, []);

  const items = useMemo(() => {
    const expanded = expandItemsByQuantity(order.items);
    return expanded.length ? expanded : [EMPTY_ITEM];
  }, [order.items]);

  const itemsLength = items.length;

  return (
    <>
      <button style={{ cursor: 'pointer', margin: '0 4px 4px 0' }} onClick={copyTable}>Copy</button>
      <table ref={tableRef} border={1} data-sheets-root="1" data-sheets-baot="1" style={tableStyle}>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              {index === 0 && (
                <>
                  <td rowSpan={itemsLength} onClick={() => copyValue(order.delivery.name)} style={tdCommonStyle}>
                    {order.delivery.name}
                  </td>
                  <td rowSpan={itemsLength} onClick={() => copyValue(order.delivery.ttn)} style={tdCommonStyle}>
                    {order.delivery.ttn}
                  </td>
                  <td rowSpan={itemsLength} onClick={() => copyValue(todayString)} style={tdCommonStyle}>
                    {todayString}
                  </td>
                  <td rowSpan={itemsLength} onClick={() => copyValue(paymentType)} style={tdCommonStyle}>
                    {paymentType}
                  </td>
                  <td rowSpan={itemsLength} onClick={() => copyValue('Сайт')} style={tdCommonStyle}>
                    Сайт
                  </td>
                </>
              )}
              <td onClick={() => copyValue(item.actualPrice)} style={tdCommonStyle}>
                {item.actualPrice}
              </td>

              {index === 0 && (<td rowSpan={itemsLength} onClick={() => copyValue(receivedPayment)} style={tdCommonStyle}>
                {receivedPayment}
              </td>)}

              <td onClick={() => copyValue(getItemDiscount(item))} style={tdCommonStyle}>
                {getItemDiscount(item)}
              </td>

              {index === 0 && (
                <>
                  <td rowSpan={itemsLength} style={tdCommonStyle}></td>
                  <td rowSpan={itemsLength} style={tdCommonStyle}></td>
                  <td rowSpan={itemsLength} onClick={() => copyValue(phoneFormatted)} style={tdCommonStyle}>
                    {phoneFormatted}
                  </td>
                  <td rowSpan={itemsLength} onClick={() => copyValue(order.delivery.email)} style={tdCommonStyle}>
                    {order.delivery.email}
                  </td>
                  <td rowSpan={itemsLength} onClick={() => copyValue(city)} style={tdCommonStyle}>
                    {city}
                  </td>
                </>
              )}
              <td onClick={() => copyValue(getItemShortName(item.name))} style={tdCommonStyle}>
                {getItemShortName(item.name)}
              </td>
              <td onClick={() => copyValue(getItemColor(item))} style={tdCommonStyle}>
                {getItemColor(item)}
              </td>
              <td onClick={() => copyValue(getItemSize(item))} style={tdCommonStyle}>
                {getItemSize(item)}
              </td>

              {index === 0 && (
                <td rowSpan={itemsLength} style={tdCommonStyle}>
                  ч
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};
