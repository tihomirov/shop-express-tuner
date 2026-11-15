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

### Formatted messages

A message with the *Formatted (HTML)* format can use `<a href="…">`, `<b>`, `<i>`, `<u>`, `<s>` and `<code>`,
e.g. `номер ТТН <a href="https://novaposhta.ua/tracking/{ttn}">{ttn}</a>`. Field values are inserted as
text (escaped), new lines become line breaks, and only links with safe protocols are kept. The popup shows
the formatted message, which can still be edited; copy buttons put it on the clipboard as HTML and as plain
text, so apps that accept formatting (Telegram, mail) keep the links. `{message}` in a link to open, like
the Telegram or Viber one, is the plain text. The built-in Shop Express message is formatted and links
the TTN to Nova Poshta tracking.

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

### Updating an installed extension

To update a copy loaded with "Load unpacked", run one of these commands in its folder (the one with
`manifest.json`). It downloads the zip of the latest release, replaces the folder's contents with it and
prints the new version; it does nothing in a folder that is not the OLa extension. Then press the reload
icon of OLa in `chrome://extensions`. Recipes are kept in Chrome's storage, so they stay.

macOS / Linux:

```bash
grep -q '"name": "OLa"' manifest.json && Z="$(mktemp)" && curl -fsSL "$(curl -fsSL https://api.github.com/repos/tihomirov/shop-express-tuner/releases/latest | grep -o 'https://[^"]*/ola-v[^"]*\.zip')" -o "$Z" && find . -mindepth 1 -delete && unzip -q "$Z" && rm "$Z" && grep '"version"' manifest.json
```

Windows (PowerShell):

```powershell
if ((Get-Content manifest.json -Raw) -match '"name": "OLa"') { $r = Invoke-RestMethod https://api.github.com/repos/tihomirov/shop-express-tuner/releases/latest; $z = Join-Path $env:TEMP 'ola.zip'; Invoke-WebRequest ($r.assets | Where-Object name -like 'ola-v*.zip').browser_download_url -OutFile $z; Get-ChildItem -Force | Remove-Item -Recurse -Force; Expand-Archive $z -DestinationPath .; Remove-Item $z; "Updated to $($r.tag_name)" } else { 'Not the OLa extension folder' }
```
