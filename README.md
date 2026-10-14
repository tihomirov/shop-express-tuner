# OLa: Shop Express tuner

Chrome extension that reads data from a web page and turns it into ready-to-use outputs: a table to
paste into a spreadsheet, a message, buttons that copy text or open a link. Originally built for
Shop Express orders, now it works with any site through **recipes**.

## Recipes

A recipe describes one site:

- **Fields**: what to read from the page. Elements are picked with the mouse (see below) and found
  later by a stable attribute, by the label next to the value, or by their position; every field keeps
  a few such ways to find the element, so small page changes do not break it.
- **Lists**: repeating blocks like the items of an order. Their fields are read from every row.
- **Computed fields, constants and lookup tables**: transform the data with templates.
- **Outputs**: a *table* (copy as HTML and paste into Google Sheets, or show it in another tab),
  a *message* with buttons, or a set of *buttons*. Buttons copy a text and/or open a link
  (`https:`, `tg:`, `viber:`, `mailto:`, `tel:`…), e.g. "Copy & Open Telegram".

The popup finds the recipe whose address pattern matches the current tab, reads the page and shows the
outputs. The first run creates the "Shop Express order" recipe from the settings of older versions.

### Picking fields

Open the page, click the extension icon and press **Pick fields** (or **Create a recipe for this page**).
A panel appears on the page: press **+ Add field**, hover over the page (the element under the mouse is
framed), click the value you want, then adjust it with **Parent / Child / ← →** if the click landed on the
wrong element. The panel shows the value that will be read, how it is found, and lets you choose how to
read it (text, input value, attribute…) and add a transform. Fields are saved right away.
For a repeating block, press **+ Add list**, click one whole row, then add its fields inside that row.

Messages, tables, buttons, computed fields and lookup tables are edited on the options page, which also
exports and imports recipes as JSON.

### Templates

Text with `{field}` parts; a part can have filters: `{phone|replace("^\+?38", "")}`,
`{total|percentOff(commission)|round(2)}`, `{fullName|split(" ", 1)}`. A filter argument is a "string",
a number or the name of another field. Filters: `trim lower upper url prefix suffix default split replace
slice kv number round add sub subFrom mul div percentOff eq ne then lookup`.
A field's *Transform* is the same list of filters without the field name: `split("₴", 0) | number`.

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

`src/__tests__/recipe-extract.ts` reads each saved page in `src/__tests__/fixtures/orders/*.html` with the
built-in Shop Express recipe and compares the result with the `.expected.json` file of the same name.
The other tests cover templates and filters, selector generation, recipe storage and URL matching.

To add a case, open an order page and run this in the DevTools console, then paste the clipboard into a new `.html` fixture:

```js
document.querySelectorAll('input').forEach(i => i.setAttribute('value', i.value));
const html = document.documentElement.cloneNode(true);
html.querySelectorAll('script, style, link, noscript, iframe').forEach(e => e.remove());
copy('<!doctype html>
' + html.outerHTML);
```

**Replace all customer data** (names, phones, emails, addresses, TTNs) with fake values in the same
format before committing. Then write the `.expected.json` from what the page shows.

## Release

Run the **Release** workflow on GitHub (Actions → Release → Run workflow) and pick the version bump.
It runs the tests, bumps the version in `package.json` and `manifest.json`, tags the commit and attaches
the zipped extension to a GitHub release.
