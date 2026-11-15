/** @jest-environment jsdom */
import { withTrackingLink } from '../recipe/builtin-shop-express';
import { normalizeRecipe } from '../recipe/normalize';
import { escapeHtml } from '../recipe/outputs';
import { htmlToText, sanitizeHtml } from '../recipe/rich-text';
import { renderTemplate } from '../recipe/template';

describe('formatted messages', () => {
  test('values are escaped, the template markup is kept', () => {
    const { text } = renderTemplate('<b>{a}</b>', { a: '<i>x</i> & "y"' }, { tables: [] }, escapeHtml);
    expect(text).toBe('<b>&lt;i&gt;x&lt;/i&gt; &amp; &quot;y&quot;</b>');
  });

  test('sanitizing keeps formatting and safe links only', () => {
    expect(sanitizeHtml('<a href="https://x.ua/1" onclick="bad()">1</a>')).toBe(
      '<a href="https://x.ua/1" target="_blank" rel="noopener noreferrer">1</a>',
    );
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
    expect(sanitizeHtml('<b style="color:red">a</b><script>alert(1)</script><img src=x onerror=alert(1)><font>c</font>')).toBe(
      '<b>a</b>c',
    );
  });

  test('plain text of the HTML keeps the line breaks and the link text', () => {
    expect(htmlToText('Hi <a href="https://x.ua">123</a><br><br>Bye')).toBe('Hi 123\n\nBye');
    expect(htmlToText('<div>one</div><div>two</div>')).toBe('one\ntwo');
    expect(htmlToText('a &amp; b')).toBe('a & b');
  });

  test('the TTN of a plain text message becomes a tracking link once', () => {
    const linked = withTrackingLink('TTN {ttn}');
    expect(linked).toBe('TTN <a href="https://novaposhta.ua/tracking/{ttn}">{ttn}</a>');
    expect(withTrackingLink(linked)).toBe(linked);
    expect(withTrackingLink('Hello')).toBe('Hello');
  });

  test('the format is stored with the message', () => {
    const recipe = (format: unknown) =>
      normalizeRecipe({ id: 'r', name: 'r', outputs: [{ type: 'message', template: 'x', format }] })?.outputs[0];
    expect(recipe('html')).toMatchObject({ format: 'html' });
    expect(recipe('bad')).toMatchObject({ format: undefined });
  });
});
