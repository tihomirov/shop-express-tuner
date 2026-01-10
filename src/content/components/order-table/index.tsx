import React, { FC, useCallback, useRef, useMemo } from "react";
import { Order } from "../../../types/order";
import { Item } from "../../../types/item";

const tdCommonStyle: React.CSSProperties = {
  border: '1px solid rgb(0, 0, 0)',
  verticalAlign: 'middle',
  textAlign: 'center',
};

const tableStyle: React.CSSProperties = {
  tableLayout: 'fixed',
  fontSize: '10pt',
  fontFamily: 'Arial',
  borderCollapse: 'collapse',
  border: 'none'
};

const paymentTypeMap = {
  'Накладений платіж': 'Накладений',
  'Оплата картами': 'Сайт',
}

const itemNameMap: Record<string, string> = {
  'Шовковиста нічна сорочка зі шнурівкою': 'ПСЧ',
  'Комбінезон': 'Комбінезон'
}

type OrderTableProps = {
  order: Order,
}

export const OrderTable: FC<OrderTableProps> = ({ order }) => {
  const tableRef = useRef<HTMLTableElement>(null);

  const todayString = useMemo(() => {
    const date = new Date(); // e.g., Sat Jan 10 2026

    const year = date.getFullYear();
    // getMonth() is zero-indexed, so add 1 and use padStart for 2 digits
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${day}.${month}.${year}`;
  }, []);

  const phoneFormatted = useMemo(() => {
    return order.delivery.phone?.replace(/^\+38/, "").replace(/^38/, "");
  }, [order]);

  const paymentTypeString = useMemo(() => {
    for (const [key, value] of Object.entries(paymentTypeMap)) {
      if (order.delivery.paymentMethod?.includes(key)) {
        return value;
      }
    }
  }, [order.delivery.paymentMethod]);

  const getColorString = useCallback((item: Item) => {
    return item.params?.split(',')[1]?.split(':').map(v => v.trim())[1];
  }, []);

  const getSizeString = useCallback((item: Item) => {
    return item.params?.split(',')[0].split(':').map(v => v.trim())[1]?.toLowerCase();
  }, []);

  const getItemNameString = useCallback((item: Item) => {
    return item.name ? itemNameMap[item.name] : '';
  }, []);

  const getDiscountString = useCallback((item: Item) => {
    if (item?.actualPrice && item.price && item.actualPrice !== item.price) {
      return `${100 - Math.round((item.actualPrice / item.price) * 100)}%`
    }

    return ''
  }, []);

  const receivePayment = useMemo(() => {
    if (paymentTypeString === paymentTypeMap['Оплата картами']) {
      const sumWithCommision = order.totalPrice - (order.totalPrice * 0.013);

      return Number.isInteger(sumWithCommision) ? sumWithCommision : sumWithCommision.toFixed(2)
    } else {
      return '';
    }
  }, [order]);

  const copyTable = useCallback(async () => {
    try {
      if (!tableRef.current) {
        throw new Error(`Table element is missing`);
      }

      const htmlString = tableRef.current.outerHTML;

      // 2. Create a Blob with 'text/html' MIME type
      const blob = new Blob([htmlString], { type: 'text/html' });

      // 3. Create a ClipboardItem (using Promise.resolve for broader compatibility)
      const clipboardItem = new ClipboardItem({
        'text/html': Promise.resolve(blob),
        'text/plain': Promise.resolve(new Blob([tableRef.current.innerText], { type: 'text/plain' })) // Also include plain text
      });

      // 4. Write to the clipboard
      await navigator.clipboard.write([clipboardItem]);
      console.log('Table copied to clipboard successfully!');

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
    return order.items.reduce((acc, item) => acc.concat(Array(item.quantity).fill(item)), [] as Item[])
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
                  <td rowSpan={itemsLength} onClick={() => copyValue(paymentTypeString)} style={tdCommonStyle}>
                    {paymentTypeString}
                  </td>
                  <td rowSpan={itemsLength} onClick={() => copyValue('Сайт')} style={tdCommonStyle}>
                    Сайт
                  </td>
                </>
              )}
              <td onClick={() => copyValue(item.actualPrice)} style={tdCommonStyle}>
                {item.actualPrice}
              </td>

              {index === 0 && (<td rowSpan={itemsLength} onClick={() => copyValue(item.actualPrice)} style={tdCommonStyle}>
                {receivePayment}
              </td>)}

              <td onClick={() => copyValue(getDiscountString(item))} style={tdCommonStyle}>
                {getDiscountString(item)}
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
                  <td rowSpan={itemsLength} onClick={() => copyValue(order.delivery.address?.split(',')[1])} style={tdCommonStyle}>
                    {order.delivery.address?.split(',')[1]}
                  </td>
                </>
              )}
              <td onClick={() => copyValue(getItemNameString(item))} style={tdCommonStyle}>
                {getItemNameString(item)}
              </td>
              <td onClick={() => copyValue(getColorString(item))} style={tdCommonStyle}>
                {getColorString(item)}
              </td>
              <td onClick={() => copyValue(getSizeString(item))} style={tdCommonStyle}>
                {getSizeString(item)}
              </td>

              {index === 0 && (
                <td rowSpan={itemsLength} style={tdCommonStyle}>
                  ч
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table >
    </>
  );
};
