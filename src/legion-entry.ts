import { LegionWsPage } from './legion/LegionWsPage';
import './legion/legionWs.css';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('Legion route root element was not found.');
}

const page = new LegionWsPage(root);
void page.render();
