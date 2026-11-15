import { FilterEnv } from './filters';
import { renderTemplate } from './template';
import { Action, ExtractResult, MessageOutput, Recipe, TableOutput, Values } from './types';

export type TableCell = Readonly<{
  text: string;
  rowSpan: number;
}>;

// Plain data, so it can be sent to another tab
export type TableModel = ReadonlyArray<ReadonlyArray<TableCell>>;

const SAFE_URL_PROTOCOLS = ['https:', 'http:', 'tg:', 'viber:', 'whatsapp:', 'mailto:', 'tel:', 'sms:'];

export const envOf = (recipe: Recipe): FilterEnv => ({ tables: recipe.tables });

export const renderText = (template: string, values: Values, recipe: Recipe): string =>
  renderTemplate(template, values, envOf(recipe)).text;

const HTML_ESCAPES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, char => HTML_ESCAPES[char]);

// The message text; for "html" messages it is HTML with escaped values and <br> for new lines
export function renderMessage(output: MessageOutput, values: Values, recipe: Recipe): string {
  if (output.format !== 'html') {
    return renderText(output.template, values, recipe);
  }
  return renderTemplate(output.template, values, envOf(recipe), escapeHtml).text.replace(/\r?\n/g, '<br>');
}

// A message as plain text and, for formatted messages, as HTML
export type MessageContent = Readonly<{
  text: string;
  html?: string;
}>;

// Rows of the table: a collection row can be repeated, e.g. an item with quantity 2 takes two rows.
// Without rows the table gets one row with the record values only.
function getTableRows(output: TableOutput, result: ExtractResult): Values[] {
  const rows = (output.rows ? result.collections[output.rows] : undefined) ?? [];
  const { repeatBy } = output;

  const expanded = rows.flatMap(row => {
    const count = repeatBy ? Math.max(1, Math.floor(parseFloat(row[repeatBy] ?? '') || 1)) : 1;
    return Array<Values>(count).fill(row);
  });

  return expanded.length > 0 ? expanded : [{}];
}

export function buildTable(output: TableOutput, result: ExtractResult, recipe: Recipe): TableModel {
  const rows = getTableRows(output, result);
  const env = envOf(recipe);

  return rows.map((row, index) =>
    output.columns.flatMap(column => {
      if (column.scope === 'record' && index > 0) {
        return [];
      }
      const values = column.scope === 'record' ? result.values : { ...result.values, ...row };
      return [
        {
          text: renderTemplate(column.template, values, env).text,
          rowSpan: column.scope === 'record' ? rows.length : 1,
        },
      ];
    }),
  );
}

export const isSafeUrl = (url: string): boolean => {
  try {
    return SAFE_URL_PROTOCOLS.includes(new URL(url).protocol);
  } catch {
    return false;
  }
};

export type ActionPlan = Readonly<{
  copy?: MessageContent;
  open?: string;
}>;

// What an action does with the current values; `message` is the message it belongs to.
// `{message}` in the action templates is the plain text of the message.
export function planAction(action: Action, values: Values, recipe: Recipe, message?: MessageContent): ActionPlan {
  const context = { ...values, message: message?.text ?? '' };
  const copy = action.text !== undefined ? { text: renderText(action.text, context, recipe) } : message;
  const url = action.url ? renderText(action.url, context, recipe) : undefined;

  return {
    copy: action.kind !== 'open' ? copy : undefined,
    open: action.kind !== 'copy' && url && isSafeUrl(url) ? url : undefined,
  };
}
