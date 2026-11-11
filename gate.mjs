// The gate: the only way out of the box. It holds the API key, so the agent does not.
// It forwards one request, POST /v1/messages, to one host, and refuses everything else.
import { createServer } from 'node:http';

const UPSTREAM = 'https://api.anthropic.com/v1/messages';

createServer(async (request, response) => {
  if (request.method !== 'POST' || request.url !== '/v1/messages') {
    console.log(`BLOCKED ${request.method} ${request.url}`);
    response.writeHead(403).end('not on the allowlist');
    return;
  }
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
  console.log(`passed  POST /v1/messages -> ${upstream.status}`);
  response.writeHead(upstream.status, { 'content-type': 'application/json' });
  response.end(await upstream.text());
}).listen(8080);
