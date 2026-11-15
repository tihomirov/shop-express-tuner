import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildTable, MessageContent, planAction, renderMessage, TableModel } from '../recipe/outputs';
import { htmlToText, sanitizeHtml } from '../recipe/rich-text';
import { Action, ButtonsOutput, ExtractResult, MessageOutput, Output, Recipe, TableOutput } from '../recipe/types';
import { TableView } from './table-view';

type OutputsViewProps = Readonly<{
  recipe: Recipe;
  result: ExtractResult;
  // Table outputs can be sent to other tabs when this is given
  renderTableExtras?: (output: TableOutput, table: TableModel) => React.ReactNode;
}>;

const sectionStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px', margin: '8px 0' };

const editableStyle: React.CSSProperties = {
  minHeight: '72px',
  padding: '4px',
  border: '1px solid #767676',
  borderRadius: '2px',
  background: '#fff',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  fontSize: '13px',
};

// Formatted text goes to the clipboard as HTML (apps that support it keep links and styles) and as plain text
async function copyContent({ text, html }: MessageContent) {
  if (html === undefined) {
    await navigator.clipboard.writeText(text);
    return;
  }
  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([text], { type: 'text/plain' }),
    }),
  ]);
}

const ActionButtons: FC<{
  actions: ReadonlyArray<Action>;
  result: ExtractResult;
  recipe: Recipe;
  // The current message, read when a button is pressed
  getMessage?: () => MessageContent;
}> = ({ actions, result, recipe, getMessage }) => {
  const run = useCallback(
    async (action: Action) => {
      const plan = planAction(action, result.values, recipe, getMessage?.());
      if (plan.copy !== undefined) {
        await copyContent(plan.copy);
      }
      if (plan.open) {
        window.open(plan.open);
      }
    },
    [result, recipe, getMessage],
  );

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {actions.map(action => (
        <button key={action.id} onClick={() => run(action)}>
          {action.label}
        </button>
      ))}
    </div>
  );
};

const MessageView: FC<{ output: MessageOutput; result: ExtractResult; recipe: Recipe }> = ({
  output,
  result,
  recipe,
}) => {
  const rendered = useMemo(() => renderMessage(output, result.values, recipe), [output, result, recipe]);
  const [message, setMessage] = useState(rendered);
  const editorRef = useRef<HTMLDivElement>(null);
  const isHtml = output.format === 'html';

  // The text can be edited by hand until the data or the template changes
  useEffect(() => setMessage(rendered), [rendered]);

  // The formatted message is edited in place, so React does not own its content
  useEffect(() => {
    if (isHtml && editorRef.current) {
      editorRef.current.innerHTML = sanitizeHtml(rendered);
    }
  }, [isHtml, rendered]);

  const getMessage = useCallback((): MessageContent => {
    if (!isHtml) {
      return { text: message };
    }
    const html = sanitizeHtml(editorRef.current?.innerHTML ?? rendered);
    return { text: htmlToText(html), html };
  }, [isHtml, message, rendered]);

  return (
    <div style={sectionStyle}>
      {isHtml ? (
        <div ref={editorRef} contentEditable suppressContentEditableWarning style={editableStyle} />
      ) : (
        <textarea rows={4} value={message} onChange={e => setMessage(e.target.value)} />
      )}
      <ActionButtons actions={output.actions} result={result} recipe={recipe} getMessage={getMessage} />
    </div>
  );
};

const TableOutputView: FC<{
  output: TableOutput;
  result: ExtractResult;
  recipe: Recipe;
  extras?: OutputsViewProps['renderTableExtras'];
}> = ({ output, result, recipe, extras }) => {
  const table = useMemo(() => buildTable(output, result, recipe), [output, result, recipe]);

  return (
    <div style={{ ...sectionStyle, overflowX: 'auto' }}>
      <TableView table={table} />
      {extras?.(output, table)}
    </div>
  );
};

const OutputView: FC<{ output: Output } & OutputsViewProps> = ({ output, recipe, result, renderTableExtras }) => {
  switch (output.type) {
    case 'table':
      return <TableOutputView output={output} result={result} recipe={recipe} extras={renderTableExtras} />;
    case 'message':
      return <MessageView output={output} result={result} recipe={recipe} />;
    case 'buttons':
      return <ButtonsView output={output} result={result} recipe={recipe} />;
  }
};

const ButtonsView: FC<{ output: ButtonsOutput; result: ExtractResult; recipe: Recipe }> = ({
  output,
  result,
  recipe,
}) => (
  <div style={sectionStyle}>
    <ActionButtons actions={output.actions} result={result} recipe={recipe} />
  </div>
);

export const OutputsView: FC<OutputsViewProps> = props => (
  <>
    {props.recipe.outputs.map(output => (
      <section key={output.id}>
        {output.title && <h4 style={{ margin: '12px 0 0' }}>{output.title}</h4>}
        <OutputView output={output} {...props} />
      </section>
    ))}
  </>
);
