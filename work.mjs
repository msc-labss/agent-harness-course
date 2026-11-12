// The work list. Plain code on your machine: the agent's box never sees it.
// work.json says which tasks are open, and the kill line of each. You edit it.
// control/work.log says which tasks are closed, and why. Nothing reopens by itself.
// Usage: node work.mjs next | spent <test> | close <test> <done|killed> [why]
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const work = JSON.parse(readFileSync('work.json', 'utf8'));
const LOG = 'control/work.log';
const rows = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : '')
  .split('\n').filter(Boolean).map((line) => JSON.parse(line));
const closed = new Set(rows(LOG).map((row) => row.test));
const open = work.open.filter((task) => !closed.has(task.test));
const [command, test, verdict, ...why] = process.argv.slice(2);

// The limit holds for you too: more open tasks than slots, and nothing runs.
if (open.length > work.slots) {
  console.log(`REFUSED: ${open.length} open tasks for ${work.slots} slots. Close one.`);
  process.exit(1);
}

if (command === 'next') {
  if (open.length) console.log(open[0].test, open[0].killAt);
} else if (command === 'spent') {
  const mine = rows('control/ledger.jsonl').filter((row) => row.task === test);
  console.log(mine.reduce((sum, row) => sum + row.tokens, 0));
} else if (command === 'close') {
  const row = { at: new Date().toISOString(), test, verdict, why: why.join(' ') };
  appendFileSync(LOG, `${JSON.stringify(row)}\n`);
  console.log(`== ${verdict}: ${test}${row.why ? ` (${row.why})` : ''}`);
}
