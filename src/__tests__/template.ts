import { applyPipeline, renderTemplate, validateExpression } from '../recipe/template';

const env = {
  tables: [
    {
      name: 'short',
      rules: [
        { match: 'equals' as const, pattern: 'Комбінезон', value: 'К' },
        { match: 'startsWith' as const, pattern: 'Лонг', value: 'Л' },
        { match: 'contains' as const, pattern: 'сукня', value: 'С' },
        { match: 'regex' as const, pattern: '^Топ \\d+$', value: 'Т' },
      ],
    },
  ],
};
const render = (template: string, ctx: Record<string, string> = {}) => renderTemplate(template, ctx, env);

describe('templates', () => {
  test('replaces fields, also repeated ones, and keeps other text', () => {
    expect(render('{a} and {a}, {b}!', { a: 'x', b: 'y' }).text).toBe('x and x, y!');
  });

  test('unknown fields render empty and are reported', () => {
    const { text, missing } = render('A{nope}B');
    expect(text).toBe('AB');
    expect(missing).toEqual(['nope']);
  });

  test('a backslash escapes a brace', () => {
    expect(render('\\{a}').text).toBe('{a}');
  });

  test('braces inside strings do not end the expression', () => {
    expect(render('{a|replace("x", "}")}', { a: 'axb' }).text).toBe('a}b');
  });

  test('reports malformed templates instead of throwing', () => {
    expect(render('{a|}', { a: 'x' }).errors).not.toEqual([]);
    expect(render('{a', { a: 'x' }).errors).not.toEqual([]);
    expect(render('{a|nope}', { a: 'x' }).errors).toEqual(['Unknown filter "nope"']);
  });

  test('literal heads', () => {
    expect(render('{"hi"|upper}').text).toBe('HI');
  });
});

describe('filters', () => {
  test('text filters', () => {
    expect(render('{a|trim|lower}', { a: '  ABC ' }).text).toBe('abc');
    expect(render('{a|split(",", 1)|trim}', { a: 'Україна, Київ, №5' }).text).toBe('Київ');
    expect(render('{a|split(",", -1)|trim}', { a: 'a, b, c' }).text).toBe('c');
    expect(render('{a|split(",", 9)}', { a: 'a' }).text).toBe('');
    expect(render('{a|replace("^\\+?38", "")}', { a: '+380671112233' }).text).toBe('0671112233');
    expect(render('{a|slice(1, 3)}', { a: 'abcd' }).text).toBe('bc');
    expect(render('{a|prefix("#")|suffix("!")}', { a: 'x' }).text).toBe('#x!');
    expect(render('{a|prefix("#")}', { a: '' }).text).toBe('');
    expect(render('{a|default(b)}', { a: '', b: 'fallback' }).text).toBe('fallback');
    expect(render('{a|url}', { a: '+380 1&2' }).text).toBe('%2B380%201%262');
  });

  test('key-value lists', () => {
    const params = { a: 'Розмір: XL, Колір: Чорний' };
    expect(render('{a|kv("Розмір")}', params).text).toBe('XL');
    expect(render('{a|kv("Колір", 1)}', params).text).toBe('Чорний');
    expect(render('{a|kv("Матеріал", 1)}', params).text).toBe('Чорний');
    expect(render('{a|kv("Матеріал")}', params).text).toBe('');
  });

  test('numbers', () => {
    expect(render('{a|number}', { a: '1 250,50 ₴' }).text).toBe('1250.5');
    expect(render('{a|number}', { a: '1 990,00 ₴' }).text).toBe('1990');
    expect(render('{a|number}', { a: 'n/a' }).text).toBe('');
    expect(render('{a|number|mul(2)|add(1)|sub(3)|div(4)}', { a: '10' }).text).toBe('4.5');
    expect(render('{a|subFrom(100)}', { a: '30' }).text).toBe('70');
    expect(render('{a|percentOff(1.3)|round(2)}', { a: '1990' }).text).toBe('1964.13');
    expect(render('{a|round(2)}', { a: '10.004' }).text).toBe('10');
    expect(render('{a|round(2)}', { a: '10.1' }).text).toBe('10.10');
  });

  test('conditions', () => {
    expect(render('{a|eq("card")|then("yes", "no")}', { a: 'card' }).text).toBe('yes');
    expect(render('{a|eq("card")|then("yes", "no")}', { a: 'cash' }).text).toBe('no');
    expect(render('{a|ne(b)|then("diff")}', { a: '1', b: '2' }).text).toBe('diff');
  });

  test('lookup tables with every match kind', () => {
    const lookup = (name: string) => render('{a|lookup("short", "?")}', { a: name }).text;
    expect(lookup('Комбінезон')).toBe('К');
    expect(lookup('Комбінезон чорний')).toBe('?');
    expect(lookup('Лонгслів синій')).toBe('Л');
    expect(lookup('Довга сукня')).toBe('С');
    expect(lookup('Топ 42')).toBe('Т');
    expect(render('{a|lookup("nope", "?")}', { a: 'x' }).text).toBe('?');
  });
});

describe('pipelines', () => {
  test('apply filters to the value', () => {
    expect(applyPipeline('2000 ₴ 1800 ₴', 'split("₴", 1) | number', {}, env).text).toBe('1800');
    expect(applyPipeline('x', '| upper', {}, env).text).toBe('X');
    expect(applyPipeline('x', 'nope', {}, env).errors).not.toEqual([]);
  });
});

test('validateExpression', () => {
  expect(validateExpression('{a|trim}', 'template')).toBeUndefined();
  expect(validateExpression('{a|nope}', 'template')).toBe('Unknown filter "nope"');
  expect(validateExpression('{a', 'template')).toBe('Missing "}"');
  expect(validateExpression('split(",", 1) | trim', 'pipeline')).toBeUndefined();
  expect(validateExpression('split(', 'pipeline')).toBeDefined();
});
