import { test } from 'node:test';
import assert from 'node:assert/strict';
import { round } from '../src/round.js';

test('rounds a half up', () => {
  assert.equal(round(2.5), 3);
});

test('rounds a half to the even number', () => {
  assert.equal(round(2.5), 2);
});
