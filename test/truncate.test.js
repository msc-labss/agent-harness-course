import { test } from 'node:test';
import assert from 'node:assert/strict';
import { truncate } from '../src/truncate.js';

test('leaves a short text alone', () => {
  assert.equal(truncate('Run agents safely', 40), 'Run agents safely');
});

test('cuts at a word boundary and adds three dots', () => {
  assert.equal(truncate('Run agents unattended safely', 15), 'Run agents...');
});
