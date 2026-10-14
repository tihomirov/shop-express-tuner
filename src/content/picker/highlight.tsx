import React, { FC, useEffect, useState } from 'react';

type Rect = Readonly<{ top: number; left: number; width: number; height: number }>;

type HighlightProps = Readonly<{
  element: Element | null;
  color: string;
  label?: boolean;
}>;

const describeElement = (element: Element) => {
  const classes = [...element.classList].slice(0, 2).map(name => `.${name}`).join('');
  return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${classes}`;
};

// A frame over an element. It is a separate box, so the page's own elements are not touched.
export const Highlight: FC<HighlightProps> = ({ element, color, label = true }) => {
  const [rect, setRect] = useState<Rect | null>(null);

  // Follows the element when the page scrolls, resizes or re-renders
  useEffect(() => {
    if (!element) {
      setRect(null);
      return;
    }

    let frame = 0;
    const update = () => {
      const { top, left, width, height } = element.getBoundingClientRect();
      setRect(previous =>
        previous && previous.top === top && previous.left === left && previous.width === width && previous.height === height
          ? previous
          : { top, left, width, height },
      );
      frame = requestAnimationFrame(update);
    };
    update();

    return () => cancelAnimationFrame(frame);
  }, [element]);

  if (!element || !rect) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        boxSizing: 'border-box',
        border: `2px solid ${color}`,
        background: `${color}22`,
        pointerEvents: 'none',
        zIndex: 2147483646,
      }}
    >
      {label && (
        <span
          style={{
            position: 'absolute',
            bottom: '100%',
            left: -2,
            background: color,
            color: '#fff',
            font: '11px/16px monospace',
            padding: '0 4px',
            whiteSpace: 'nowrap',
          }}
        >
          {describeElement(element)}
        </span>
      )}
    </div>
  );
};
