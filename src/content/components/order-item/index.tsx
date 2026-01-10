import React, { FC, useCallback, useRef, MouseEvent } from "react";
import { Order } from '../../../types/order';
import { OrderTable } from '../order-table';

type OrderProps = {
  order: Order;
  index: number;
  onClose: () => void
}

export const OrderItem: FC<OrderProps> = ({ order, index, onClose }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const offsetX = useRef(0);
  const offsetY = useRef(0);
  const isDragging = useRef(false);

  const onMouseDown = useCallback((e: MouseEvent) => {
    if (!elementRef.current) {
      return
    }

    isDragging.current = true;
    // Calculate the offset from the element's top-left corner to the mouse pointer
    offsetX.current = e.clientX - elementRef.current.getBoundingClientRect().left;
    offsetY.current = e.clientY - elementRef.current.getBoundingClientRect().top;
    // Optional: Add a class for visual feedback (e.g., change cursor to 'moving')
    elementRef.current.style.cursor = 'moving';
    // Prevent default browser drag behavior for images/links within the element
    e.preventDefault();
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!elementRef.current) {
      return
    }
    if (isDragging.current) {
      // Calculate new position based on mouse pointer and initial offset
      // clientX/Y are relative to the viewport, which works perfectly with position: fixed
      const newX = e.clientX - offsetX.current;
      const newY = e.clientY - offsetY.current;

      // Apply the new position
      elementRef.current.style.left = newX + 'px';
      elementRef.current.style.top = newY + 'px';
    }
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div ref={elementRef} onMouseMove={onMouseMove} style={{
      position: 'fixed',
      width: '600px',
      zIndex: `${99999 + index}`,
      right: `${index * 4}px`,
      top: `${index * 4}px`,
      backgroundColor: 'lightyellow',
      borderRadius: '6px',
      boxShadow: '3px 3px 7px 0px rgba(0,0,0,0.7)',
    }}>
      <div style={{ position: 'absolute', top: '4px', left: '4px', display: 'flex', gap: '4px' }}>
        <button onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="12" height="12" viewBox="0 0 50 50">
            <path d="M 7.71875 6.28125 L 6.28125 7.71875 L 23.5625 25 L 6.28125 42.28125 L 7.71875 43.71875 L 25 26.4375 L 42.28125 43.71875 L 43.71875 42.28125 L 26.4375 25 L 43.71875 7.71875 L 42.28125 6.28125 L 25 23.5625 Z"></path>
          </svg>
        </button>
        <button onMouseDown={onMouseDown} onMouseUp={onMouseUp}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M16.1924 5.65683C16.5829 5.2663 16.5829 4.63314 16.1924 4.24261L13.364 1.41419C12.5829 0.633139 11.3166 0.633137 10.5355 1.41419L7.70711 4.24261C7.31658 4.63314 7.31658 5.2663 7.70711 5.65683C8.09763 6.04735 8.73079 6.04735 9.12132 5.65683L11 3.77812V11.0503H3.72784L5.60655 9.17157C5.99707 8.78104 5.99707 8.14788 5.60655 7.75735C5.21602 7.36683 4.58286 7.36683 4.19234 7.75735L1.36391 10.5858C0.582863 11.3668 0.582859 12.6332 1.36391 13.4142L4.19234 16.2426C4.58286 16.6332 5.21603 16.6332 5.60655 16.2426C5.99707 15.8521 5.99707 15.219 5.60655 14.8284L3.8284 13.0503H11V20.2219L9.12132 18.3432C8.73079 17.9526 8.09763 17.9526 7.7071 18.3432C7.31658 18.7337 7.31658 19.3669 7.7071 19.7574L10.5355 22.5858C11.3166 23.3669 12.5829 23.3669 13.364 22.5858L16.1924 19.7574C16.5829 19.3669 16.5829 18.7337 16.1924 18.3432C15.8019 17.9526 15.1687 17.9526 14.7782 18.3432L13 20.1213V13.0503H20.071L18.2929 14.8284C17.9024 15.219 17.9024 15.8521 18.2929 16.2426C18.6834 16.6332 19.3166 16.6332 19.7071 16.2426L22.5355 13.4142C23.3166 12.6332 23.3166 11.3668 22.5355 10.5858L19.7071 7.75735C19.3166 7.36683 18.6834 7.36683 18.2929 7.75735C17.9024 8.14788 17.9024 8.78104 18.2929 9.17157L20.1716 11.0503H13V3.87867L14.7782 5.65683C15.1687 6.04735 15.8019 6.04735 16.1924 5.65683Z" fill="#0F0F0F"></path> </g></svg>
        </button>
      </div>

      <div style={{
        padding: '28px 6px 6px',
        width: '100%',
        height: '100%',
        overflowY: 'scroll',
      }}>
        <OrderTable order={order} />
      </div>
    </div>
  );
};
