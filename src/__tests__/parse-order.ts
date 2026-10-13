/** @jest-environment jsdom */
import fs from 'fs';
import path from 'path';
import { parseOrder } from '../content/events/parse-order';

const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'orders');
const fixtures = fs.readdirSync(FIXTURES_DIR).filter(file => file.endsWith('.html'));

test.each(fixtures)('parses %s', (file) => {
  const html = fs.readFileSync(path.join(FIXTURES_DIR, file), 'utf8');
  const expectedFile = path.join(FIXTURES_DIR, file.replace(/\.html$/, '.expected.json'));
  const expected = JSON.parse(fs.readFileSync(expectedFile, 'utf8'));
  const doc = new DOMParser().parseFromString(html, 'text/html');

  expect(parseOrder(doc)).toEqual(expected);
});
