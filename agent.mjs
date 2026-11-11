// An agent harness with a lock on it: four narrow tools instead of a shell,
// and a policy that is checked before any of them touches a file.
// It holds no API key: every request goes through the gate (gate.mjs).
// Usage: ANTHROPIC_API_KEY=... ./box.sh "make the tests pass"
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

const MODEL = 'claude-opus-5-5';
const MAX_TURNS = 20;
const GATE = process.env.GATE_URL ?? 'http://gate:8080';
const policy = JSON.parse(readFileSync('policy.json', 'utf8'));

const path = { type: 'string', description: 'A path inside the project folder' };
const tool = (name, description, properties = {}) => ({
  name,
  description,
  input_schema: { type: 'object', properties, required: Object.keys(properties) },
});
const tools = [
  tool('list_files', 'List the files in the project folder.'),
  tool('read_file', 'Read one file.', { path }),
  tool('write_file', 'Create or replace one file.', { path, content: { type: 'string' } }),
  tool('run_tests', 'Run the test suite (npm test) and return its output.'),
];

// The lock. It throws when a path is outside the project or on a deny list.
function allowed(file, denied) {
  const inside = relative('.', resolve(file));
  if (inside.startsWith('..') || isAbsolute(inside)) throw new Error('outside the project');
  const matches = (rule) => inside === rule || (rule.endsWith('/') && inside.startsWith(rule));
  const hit = denied.find(matches);
  if (hit) throw new Error(`denied by policy.json (${hit})`);
  return inside;
}

const run = {
  list_files: () => readdirSync('.', { recursive: true })
    .filter((name) => !name.startsWith('.git/') && name !== '.git').join('\n'),
  read_file: ({ path: file }) => readFileSync(allowed(file, policy.denyRead), 'utf8'),
  write_file: ({ path: file, content }) => {
    writeFileSync(allowed(file, policy.denyWrite), content);
    return 'written';
  },
  run_tests: () => {
    try {
      return execSync('npm test 2>&1', { encoding: 'utf8', timeout: 60_000 }).slice(-4000);
    } catch (error) {
      return `${error.stdout ?? ''}`.slice(-4000);
    }
  },
};

// The model never runs anything. It asks; the harness checks, then does the work.
function runTool({ id, name, input }) {
  const call = `${name}(${input.path ?? ''})`;
  try {
    const content = run[name](input) || '(no output)';
    console.log(`  ok      ${call}`);
    return { type: 'tool_result', tool_use_id: id, content };
  } catch (error) {
    console.log(`  REFUSED ${call}: ${error.message}`);
    return { type: 'tool_result', tool_use_id: id, content: error.message, is_error: true };
  }
}

async function callModel(messages) {
  const response = await fetch(`${GATE}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': '2026-10-21',
      'anthropic-beta': 'server-side-fallback-2026-07-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 16000,
      fallbacks: 'default',
      system: 'You are a coding agent working in a project folder. Use the tools to read, '
        + 'edit and test files. A refused tool call is final: do not try a way around it.',
      tools,
      messages,
    }),
  });
  if (!response.ok) throw new Error(`API ${response.status}: ${await response.text()}`);
  return response.json();
}

const messages = [{ role: 'user', content: process.argv[2] ?? 'make the tests pass' }];

for (let turn = 1; turn <= MAX_TURNS; turn += 1) {
  const reply = await callModel(messages);
  messages.push({ role: 'assistant', content: reply.content });
  for (const block of reply.content) if (block.type === 'text') console.log(`\n${block.text}`);
  if (reply.stop_reason !== 'tool_use') {
    console.log(`\nstopped: ${reply.stop_reason} after ${turn} requests`);
    break;
  }
  const calls = reply.content.filter((block) => block.type === 'tool_use');
  messages.push({ role: 'user', content: calls.map(runTool) });
}
