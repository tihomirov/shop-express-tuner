import { useEffect, useRef, useState } from 'react';

// Events the page would react to; while picking, a click must select an element, not press a button
const BLOCKED_EVENTS = ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'dblclick', 'contextmenu', 'auxclick', 'submit'];

type PagePickerOptions = Readonly<{
  active: boolean;
  // Events from inside this element (our own panel) are left alone
  host: HTMLElement;
  onPick: (element: Element) => void;
  onCancel: () => void;
}>;

// While active, follows the mouse and reports the element under it; a click picks that element instead of
// reaching the page. Returns the element under the mouse.
export function usePagePicker({ active, host, onPick, onCancel }: PagePickerOptions): Element | null {
  const [hovered, setHovered] = useState<Element | null>(null);
  // The latest callbacks, so the listeners are not re-added on every render
  const callbacks = useRef({ onPick, onCancel });
  callbacks.current = { onPick, onCancel };

  useEffect(() => {
    if (!active) {
      setHovered(null);
      return;
    }

    const isOurs = (event: Event) => event.composedPath().includes(host);

    const onMove = (event: MouseEvent) => {
      const target = event.composedPath()[0];
      setHovered(isOurs(event) || !(target instanceof Element) ? null : target);
    };

    const block = (event: Event) => {
      if (!isOurs(event)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };

    const onClick = (event: MouseEvent) => {
      const target = event.composedPath()[0];
      if (isOurs(event) || !(target instanceof Element)) {
        return;
      }
      block(event);
      callbacks.current.onPick(target);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        callbacks.current.onCancel();
      }
    };

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    BLOCKED_EVENTS.forEach(type => document.addEventListener(type, block, true));
    const previousCursor = document.documentElement.style.cursor;
    document.documentElement.style.cursor = 'crosshair';

    return () => {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      BLOCKED_EVENTS.forEach(type => document.removeEventListener(type, block, true));
      document.documentElement.style.cursor = previousCursor;
      setHovered(null);
    };
  }, [active, host]);

  return hovered;
}
