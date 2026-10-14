import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { buildTable, planAction, renderText, TableModel } from '../recipe/outputs';
import { Action, ButtonsOutput, ExtractResult, MessageOutput, Output, Recipe, TableOutput } from '../recipe/types';
import { TableView } from './table-view';

type OutputsViewProps = Readonly<{
  recipe: Recipe;
  result: ExtractResult;
  // Table outputs can be sent to other tabs when this is given
  renderTableExtras?: (output: TableOutput, table: TableModel) => React.ReactNode;
}>;

const sectionStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px', margin: '8px 0' };

const ActionButtons: FC<{
  actions: ReadonlyArray<Action>;
  result: ExtractResult;
  recipe: Recipe;
  message?: string;
}> = ({ actions, result, recipe, message }) => {
  const run = useCallback(
    async (action: Action) => {
      const plan = planAction(action, result.values, recipe, message);
      if (plan.copy !== undefined) {
        await navigator.clipboard.writeText(plan.copy);
      }
      if (plan.open) {
        window.open(plan.open);
      }
    },
    [result, recipe, message],
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
  const rendered = useMemo(() => renderText(output.template, result.values, recipe), [output, result, recipe]);
  const [message, setMessage] = useState(rendered);

  // The text can be edited by hand until the data or the template changes
  useEffect(() => setMessage(rendered), [rendered]);

  return (
    <div style={sectionStyle}>
      <textarea rows={4} value={message} onChange={e => setMessage(e.target.value)} />
      <ActionButtons actions={output.actions} result={result} recipe={recipe} message={message} />
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
