// A whole agent harness in one file: a model, one tool, and a loop.
// Usage: ANTHROPIC_API_KEY=... node agent.mjs "make the tests pass"
import { execSync } from 'node:child_process';

const MODEL = 'claude-opus-5-5';
const MAX_TURNS = 20;

// The only tool the model gets: run a shell command in this folder.
const tools = [{
  name: 'shell',
  description: 'Run a shell command in the project folder and return its output.',
  input_schema: {
    type: 'object',
    properties: { command: { type: 'string', description: 'The command to run' } },
    required: ['command'],
  },
}];

// The model never runs anything. It asks; this function does the work.
function runTool(input) {
  console.log(`\n$ ${input.command}`);
  let output;
  try {
    output = execSync(input.command, { encoding: 'utf8', timeout: 60_000, stdio: 'pipe' });
  } catch (error) {
    output = `${error.stdout ?? ''}${error.stderr ?? ''}\nexit code: ${error.status}`;
  }
  if (output.length > 8000) output = `${output.slice(0, 8000)}\n[cut: ${output.length} characters in total]`;
  console.log(output.trimEnd());
  return output || '(no output)';
}

async function callModel(messages) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2026-10-21',
      'anthropic-beta': 'server-side-fallback-2026-07-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 16000,
      fallbacks: 'default',
      system: 'You are a coding agent working in a project folder. Use the shell tool to read, edit and test files. Stop when the task is done.',
      tools,
      messages,
    }),
  });
  if (!response.ok) throw new Error(`API ${response.status}: ${await response.text()}`);
  return response.json();
}

const messages = [{ role: 'user', content: process.argv[2] ?? 'make the tests pass' }];
const used = { input: 0, output: 0 };

for (let turn = 1; turn <= MAX_TURNS; turn += 1) {
  const reply = await callModel(messages);
  used.input += reply.usage.input_tokens;
  used.output += reply.usage.output_tokens;
  if (turn === 1) console.log(`first request: ${reply.usage.input_tokens} input tokens`);

  // Keep everything the model said, so the next request carries the history.
  messages.push({ role: 'assistant', content: reply.content });
  for (const block of reply.content) if (block.type === 'text') console.log(`\n${block.text}`);

  // No tool call means the model thinks it is done (or it stopped for another reason).
  if (reply.stop_reason !== 'tool_use') {
    console.log(`\nstopped: ${reply.stop_reason} after ${turn} requests, ${used.input} input and ${used.output} output tokens`);
    break;
  }

  // Run every tool call and send all the results back in one message.
  const results = reply.content
    .filter((block) => block.type === 'tool_use')
    .map((block) => ({ type: 'tool_result', tool_use_id: block.id, content: runTool(block.input) }));
  messages.push({ role: 'user', content: results });
}
