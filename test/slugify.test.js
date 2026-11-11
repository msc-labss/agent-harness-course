import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from '../src/slugify.js';

test('lowercases and joins two words', () => {
  assert.equal(slugify('Hello World'), 'hello-world');
});

test('joins every word, not only the first two', () => {
  assert.equal(slugify('Run agents unattended safely'), 'run-agents-unattended-safely');
});

test('drops punctuation and extra spaces', () => {
  assert.equal(slugify('  What is a harness?  '), 'what-is-a-harness');
});
