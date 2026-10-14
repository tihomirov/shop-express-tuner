import { FILTERS, FilterEnv } from './filters';
import { Values } from './types';

// Template: text with `{expression}` parts. An expression is a field name or a "string"
// followed by filters: `{phone|replace("^\+?38", "")}`, `{total|percentOff(commission)|round(2)}`.
// Filter arguments are "strings", numbers or names of other fields. `\{` is a literal brace.
// A pipeline is the same without the head, e.g. `split("₴", 0) | number`.

type Arg = Readonly<{ type: 'string' | 'number' | 'ref'; value: string }>;
type FilterCall = Readonly<{ name: string; args: ReadonlyArray<Arg> }>;
type Expression = Readonly<{ head?: Arg; filters: ReadonlyArray<FilterCall> }>;
type Segment = Readonly<{ text: string } | { expression: Expression }>;

export class TemplateError extends Error {}

const IDENTIFIER = /[\p{L}_][\p{L}\p{N}_.]*/uy;
const NUMBER = /-?\d+(\.\d+)?/y;

class ExpressionParser {
  private position = 0;

  constructor(
    private readonly source: string,
    private readonly pipeline: boolean,
  ) {}

  parse(): Expression {
    this.skipSpaces();
    let head: Arg | undefined;

    if (!this.pipeline) {
      head = this.readString() ?? this.readIdentifier();
      if (!head) {
        throw new TemplateError(`Expected a field name at "${this.source.slice(this.position)}"`);
      }
    } else if (this.peek() === '|') {
      this.position++;
    }

    const filters: FilterCall[] = [];
    for (;;) {
      this.skipSpaces();
      if (this.position >= this.source.length) {
        break;
      }
      if (filters.length > 0 || head) {
        this.expect('|');
        this.skipSpaces();
      }
      filters.push(this.readFilter());
    }

    return { head, filters };
  }

  private readFilter(): FilterCall {
    const name = this.readIdentifier()?.value;
    if (!name) {
      throw new TemplateError(`Expected a filter name at "${this.source.slice(this.position)}"`);
    }

    const args: Arg[] = [];
    this.skipSpaces();
    if (this.peek() === '(') {
      this.position++;
      this.skipSpaces();
      while (this.peek() !== ')') {
        const arg = this.readString() ?? this.readNumber() ?? this.readIdentifier();
        if (!arg) {
          throw new TemplateError(`Bad argument of "${name}" at "${this.source.slice(this.position)}"`);
        }
        args.push(arg);
        this.skipSpaces();
        if (this.peek() === ',') {
          this.position++;
          this.skipSpaces();
        } else if (this.peek() !== ')') {
          throw new TemplateError(`Expected "," or ")" in "${name}"`);
        }
      }
      this.position++;
    }

    return { name, args };
  }

  private peek(): string | undefined {
    return this.source[this.position];
  }

  private expect(char: string) {
    if (this.peek() !== char) {
      throw new TemplateError(`Expected "${char}" at "${this.source.slice(this.position)}"`);
    }
    this.position++;
  }

  private skipSpaces() {
    while (/\s/.test(this.peek() ?? '')) {
      this.position++;
    }
  }

  private readMatch(pattern: RegExp, type: Arg['type']): Arg | undefined {
    pattern.lastIndex = this.position;
    const match = pattern.exec(this.source);
    if (!match) {
      return undefined;
    }
    this.position += match[0].length;
    return { type, value: match[0] };
  }

  private readIdentifier = () => this.readMatch(IDENTIFIER, 'ref');

  private readNumber = () => this.readMatch(NUMBER, 'number');

  private readString(): Arg | undefined {
    const quote = this.peek();
    if (quote !== '"' && quote !== "'") {
      return undefined;
    }

    let value = '';
    this.position++;
    while (this.position < this.source.length) {
      const char = this.source[this.position++];
      if (char === quote) {
        return { type: 'string', value };
      }
      const next = this.source[this.position];
      // Only quotes and backslashes are escaped, so regex escapes like \s or \+ stay as written
      if (char === '\\' && (next === '"' || next === "'" || next === '\\')) {
        value += next;
        this.position++;
      } else {
        value += char;
      }
    }
    throw new TemplateError('Unclosed string');
  }
}

// Position of the "}" that closes the expression started before `from`, ignoring braces inside strings
function findExpressionEnd(source: string, from: number): number {
  let quote: string | undefined;
  for (let i = from; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (char === '\\') {
        i++;
      } else if (char === quote) {
        quote = undefined;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '}') {
      return i;
    }
  }
  return -1;
}

const templateCache = new Map<string, Segment[]>();

function parseTemplate(source: string): Segment[] {
  const cached = templateCache.get(source);
  if (cached) {
    return cached;
  }

  const segments: Segment[] = [];
  let text = '';
  let i = 0;

  while (i < source.length) {
    if (source[i] === '\\' && source[i + 1] === '{') {
      text += '{';
      i += 2;
    } else if (source[i] === '{') {
      const end = findExpressionEnd(source, i + 1);
      if (end < 0) {
        throw new TemplateError('Missing "}"');
      }
      if (text) {
        segments.push({ text });
        text = '';
      }
      segments.push({ expression: new ExpressionParser(source.slice(i + 1, end), false).parse() });
      i = end + 1;
    } else {
      text += source[i++];
    }
  }
  if (text) {
    segments.push({ text });
  }

  templateCache.set(source, segments);
  return segments;
}

export type Evaluation = Readonly<{
  text: string;
  // Names that are not fields of the record
  missing: ReadonlyArray<string>;
  errors: ReadonlyArray<string>;
}>;

function evaluate(
  expression: Expression,
  input: string,
  ctx: Values,
  env: FilterEnv,
  missing: string[],
  errors: string[],
): string {
  const resolve = ({ type, value }: Arg): string => {
    if (type !== 'ref') {
      return value;
    }
    if (!(value in ctx)) {
      missing.push(value);
    }
    return ctx[value] ?? '';
  };

  let result = expression.head ? resolve(expression.head) : input;
  for (const { name, args } of expression.filters) {
    const filter = FILTERS[name];
    if (!filter) {
      errors.push(`Unknown filter "${name}"`);
      continue;
    }
    result = filter(result, args.map(resolve), env);
  }
  return result;
}

const toError = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function renderTemplate(source: string, ctx: Values, env: FilterEnv): Evaluation {
  const missing: string[] = [];
  const errors: string[] = [];
  let text = '';

  try {
    for (const segment of parseTemplate(source)) {
      text += 'text' in segment ? segment.text : evaluate(segment.expression, '', ctx, env, missing, errors);
    }
  } catch (e) {
    errors.push(toError(e));
  }

  return { text, missing, errors };
}

const pipelineCache = new Map<string, Expression>();

// Runs the filters of `pipeline` over `value`
export function applyPipeline(value: string, pipeline: string, ctx: Values, env: FilterEnv): Evaluation {
  const missing: string[] = [];
  const errors: string[] = [];
  let text = value;

  try {
    let expression = pipelineCache.get(pipeline);
    if (!expression) {
      expression = new ExpressionParser(pipeline, true).parse();
      pipelineCache.set(pipeline, expression);
    }
    text = evaluate(expression, value, ctx, env, missing, errors);
  } catch (e) {
    errors.push(toError(e));
  }

  return { text, missing, errors };
}

// Error to show in an editor, if the template or pipeline is malformed or uses an unknown filter
export function validateExpression(source: string, kind: 'template' | 'pipeline'): string | undefined {
  try {
    const expressions =
      kind === 'template'
        ? parseTemplate(source).flatMap(segment => ('expression' in segment ? [segment.expression] : []))
        : [new ExpressionParser(source, true).parse()];
    const unknown = expressions.flatMap(({ filters }) => filters.map(({ name }) => name)).find(name => !(name in FILTERS));
    return unknown ? `Unknown filter "${unknown}"` : undefined;
  } catch (e) {
    return toError(e);
  }
}
