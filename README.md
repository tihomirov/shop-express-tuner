# OLa: Shop Express tuner

Chrome extension with tools for processing Shop Express orders:

- **Popup** reads the order from the open Shop Express order page and shows it. It can send the order
  to any other tab as a floating window with a table ready to paste into a spreadsheet.
- **Customer message** is generated from a template and can be copied or opened in Telegram / Viber.
- **Options page** lets you edit the message template; placeholders like `{firstName}` or `{ttn}` are
  filled from the order.

## Development

Requires Node 24 (see `.nvmrc`).

```bash
npm install
npm run watch   # rebuild on change
npm run build   # production build
npm test
```

Load the `dist` directory in Chrome via `chrome://extensions` → "Load unpacked".

## Tests

`src/__tests__/parse-order.ts` parses each saved order page in `src/__tests__/fixtures/orders/*.html`
and compares the result with the `.expected.json` file of the same name.

To add a case, open an order page and run this in the DevTools console, then paste the clipboard into a new `.html` fixture:

```js
document.querySelectorAll('input').forEach(i => i.setAttribute('value', i.value));
const html = document.documentElement.cloneNode(true);
html.querySelectorAll('script, style, link, noscript, iframe').forEach(e => e.remove());
copy('<!doctype html>\n' + html.outerHTML);
```

**Replace all customer data** (names, phones, emails, addresses, TTNs) with fake values in the same
format before committing. Then write the `.expected.json` from what the page shows.

## Release

Run the **Release** workflow on GitHub (Actions → Release → Run workflow) and pick the version bump.
It runs the tests, bumps the version in `package.json` and `manifest.json`, tags the commit and attaches
the zipped extension to a GitHub release.
