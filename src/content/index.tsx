import { At } from '../at';
import { App } from './App';

export function run(): void {
  const rootEl = document.createElement('div');

  rootEl.id = 'ola-root';
  rootEl.style.position = 'absolut';

  document.body.appendChild(rootEl);

  if (rootEl && rootEl instanceof HTMLDivElement) {
    At.init(rootEl)
      .render(App);
  }
}

run();
