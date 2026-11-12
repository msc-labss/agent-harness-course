import { test } from 'node:test';
import assert from 'node:assert/strict';
import { titleCase } from '../src/titlecase.js';

test('capitalises every word', () => {
  assert.equal(titleCase('run agents safely'), 'Run Agents Safely');
});

test('keeps small words lower, except the first', () => {
  assert.equal(titleCase('a box and a gate'), 'A Box and a Gate');
});
