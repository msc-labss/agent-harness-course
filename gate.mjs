// The gate: the only way out of the box. It holds the API key, so the agent does not.
// It forwards one request, POST /v1/messages, to one host, and refuses everything else.
// It also keeps the bill: a budget per run and per day, a ledger, and a stop file.
import { createServer } from 'node:http';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const UPSTREAM = 'https://api.anthropic.com/v1/messages';
const LEDGER = '/control/ledger.jsonl';
const budget = JSON.parse(readFileSync('/budget.json', 'utf8'));
const run = { requests: 0, tokens: 0 };
const today = () => new Date().toISOString().slice(0, 10);

function tokensToday() {
  if (!existsSync(LEDGER)) return 0;
  return readFileSync(LEDGER, 'utf8').trim().split('\n').filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((row) => row.day === today())
    .reduce((sum, row) => sum + row.tokens, 0);
}

// Plain code decides, before a request leaves. The model does not get a vote.
function refusal() {
  if (existsSync('/control/STOP')) return 'the STOP file is present';
  if (run.requests >= budget.runRequests) return `run budget spent: ${run.requests} of ${budget.runRequests} requests`;
  if (run.tokens >= budget.runTokens) return `run budget spent: ${run.tokens} of ${budget.runTokens} tokens`;
  if (tokensToday() >= budget.dayTokens) return `day budget spent: ${tokensToday()} of ${budget.dayTokens} tokens`;
  return null;
}

createServer(async (request, response) => {
  if (request.method !== 'POST' || request.url !== '/v1/messages') {
    console.log(`BLOCKED ${request.method} ${request.url}`);
    response.writeHead(403).end('not on the allowlist');
    return;
  }
  const why = refusal();
  if (why) {
    console.log(`REFUSED ${why}`);
    response.writeHead(403).end(why);
    return;
  }
  run.requests += 1;
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const upstream = await fetch(UPSTREAM, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': request.headers['anthropic-version'],
      'anthropic-beta': request.headers['anthropic-beta'],
    },
    body: Buffer.concat(chunks),
  });
  const text = await upstream.text();
  let usage = {};
  try { usage = JSON.parse(text).usage ?? {}; } catch { /* not JSON: nothing to count */ }
  const tokens = (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0);
  run.tokens += tokens;
  appendFileSync(LEDGER, `${JSON.stringify({ day: today(), request: run.requests, tokens, status: upstream.status })}\n`);
  console.log(`passed  request ${run.requests} -> ${upstream.status}, ${tokens} tokens`);
  response.writeHead(upstream.status, { 'content-type': 'application/json' });
  response.end(text);
}).listen(8080);
