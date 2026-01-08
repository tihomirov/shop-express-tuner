import React, { FC, useCallback, useRef, useMemo } from "react";
import { Order } from "../../../types/order";
import { Item } from "../../../types/item";

const tdCommonStyle: React.CSSProperties = {
  border: '1px solid rgb(0, 0, 0)',
  verticalAlign: 'middle',
  textAlign: 'center',
};

const paymentTypeMap = {
  'Накладений платіж': 'Накладений',
  'Оплата картами': 'Сайт',
}

const itemNameMap: Record<string, string> = {
  'Шовковиста нічна сорочка зі шнурівкою': 'ПСЧ',
  'Комбінезон': 'Комбінезон'
}

export const OrderTable: FC<{ order: Order }> = ({ order }) => {
  const tableRef = useRef<HTMLTableElement>(null);

  const copyValue = useCallback((value: string | number) => {
    navigator.clipboard.writeText(value.toString());
  }, []);

  const todayString = useMemo(() => (new Date()).toLocaleDateString(), []);

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

  const readTable = useCallback(async () => {
    try {
      const clipText = await navigator.clipboard.read();

      for (const item of clipText) {
        if (item.types.includes('text/html')) {
          const blob = await item.getType('text/html');
          const htmlText = await blob.text();
          console.log('Clipboard HTML content:', htmlText);
          return htmlText;
        }
      }
      // You can then use the text as needed in your application
      // e.g., document.getElementById("output").innerText = clipText;
    } catch (err) {
      console.error("Failed to read clipboard contents: ", err);
      // This often happens if the user denies permission or the page is not in focus
    }
  }, []);

  const items = useMemo(() => {
    return order.items.reduce((acc, item) => acc.concat(Array(item.quantity).fill(item)), [] as Item[])
  }, [order.items]);

  const itemsLength = items.length;

  return (
    <>
      <button style={{ cursor: 'pointer', margin: '0 4px 4px 0' }} onClick={copyTable}>Copy</button>
      <button style={{ cursor: 'pointer' }} onClick={readTable}>Read</button>
      <table ref={tableRef} border={1} data-sheets-root="1" data-sheets-baot="1" style={{ tableLayout: 'fixed', fontSize: '10pt', fontFamily: 'Arial', borderCollapse: 'collapse', border: 'none' }}>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              {index === 0 && (
                <>
                  <td rowSpan={itemsLength} onClick={() => copyValue(order.delivery.name)} style={tdCommonStyle}>
                    {order.delivery.name}
                  </td>
                  <td rowSpan={itemsLength} onClick={() => copyValue(order.delivery.name)} style={tdCommonStyle}>
                    {order.delivery.ttn}
                  </td>
                  <td rowSpan={itemsLength} onClick={() => copyValue(todayString)} style={tdCommonStyle}>
                    {todayString}
                  </td>
                  <td rowSpan={itemsLength} onClick={() => copyValue(order.delivery.name)} style={tdCommonStyle}>
                    {paymentTypeString}
                  </td>
                  <td rowSpan={itemsLength} onClick={() => copyValue(order.delivery.name)} style={tdCommonStyle}>
                    Сайт
                  </td>
                </>
              )}
              <td onClick={() => copyValue(order.delivery.name)} style={tdCommonStyle}>
                {item.actualPrice}
              </td>

              {index === 0 && (<td rowSpan={itemsLength} style={tdCommonStyle}></td>)}

              <td onClick={() => copyValue(order.delivery.name)} style={tdCommonStyle}>
                {getDiscountString(item)}
              </td>

              {index === 0 && (
                <>
                  <td rowSpan={itemsLength} style={tdCommonStyle}></td>
                  <td rowSpan={itemsLength} style={tdCommonStyle}></td>
                  <td rowSpan={itemsLength} onClick={() => copyValue(order.delivery.name)} style={tdCommonStyle}>
                    {order.delivery.phone?.replace(/^\+38/, "").replace(/^38/, "")}
                  </td>
                  <td rowSpan={itemsLength} onClick={() => copyValue(order.delivery.name)} style={tdCommonStyle}>
                    {order.delivery.email}
                  </td>
                  <td rowSpan={itemsLength} onClick={() => copyValue(order.delivery.name)} style={tdCommonStyle}>
                    {order.delivery.address?.split(',')[1]}
                  </td>
                </>
              )}
              <td onClick={() => copyValue(order.delivery.name)} style={tdCommonStyle}>
                {getItemNameString(item)}
              </td>
              <td onClick={() => copyValue(order.delivery.name)} style={tdCommonStyle}>
                {getColorString(item)}
              </td>
              <td onClick={() => copyValue(order.delivery.name)} style={tdCommonStyle}>
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
