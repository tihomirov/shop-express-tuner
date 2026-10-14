import React, { FC, useCallback, useRef } from 'react';
import { TableModel } from '../recipe/outputs';

const tdStyle: React.CSSProperties = {
  border: '1px solid rgb(0, 0, 0)',
  verticalAlign: 'middle',
  textAlign: 'center',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'rgb(0, 0, 0) rgb(0, 0, 0) rgb(0, 0, 0) rgb(204, 204, 204)',
  borderImage: 'initial',
  overflow: 'hidden',
  padding: '2px 3px',
  minWidth: '14px',
  height: '18px',
};

const tableStyle: React.CSSProperties = {
  tableLayout: 'fixed',
  fontSize: '10pt',
  fontFamily: 'Arial',
  borderCollapse: 'collapse',
  border: 'none',
};

type TableViewProps = Readonly<{
  table: TableModel;
}>;

// The table is copied as HTML, so pasting it into a spreadsheet keeps the cells
export const TableView: FC<TableViewProps> = ({ table }) => {
  const tableRef = useRef<HTMLTableElement>(null);

  const copyTable = useCallback(async () => {
    try {
      if (!tableRef.current) {
        throw new Error('Table element is missing');
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

  const copyValue = useCallback((value: string) => {
    if (value) {
      navigator.clipboard.writeText(value);
    }
  }, []);

  return (
    <>
      <button style={{ cursor: 'pointer', margin: '0 4px 4px 0' }} onClick={copyTable}>
        Copy
      </button>
      <span style={{ fontSize: '11px', color: '#666' }}>click a cell to copy its value</span>
      <table ref={tableRef} border={1} data-sheets-root="1" data-sheets-baot="1" style={tableStyle}>
        <tbody>
          {table.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} rowSpan={cell.rowSpan} onClick={() => copyValue(cell.text)} style={tdStyle}>
                  {cell.text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};
