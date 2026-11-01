import test from 'node:test';
import assert from 'node:assert/strict';
import { sectionTitle } from './fatti.mjs';

test('section titles keep dots inside tool names', () => {
  assert.equal(sectionTitle('llama.cpp'), 'llama.cpp');
  assert.equal(sectionTitle('Node.js setup'), 'Node.js setup');
  assert.equal(sectionTitle('Step 1: Write a failing test.'), 'Write a failing test');
  assert.equal(sectionTitle('1. Correctness'), 'Correctness');
  assert.equal(sectionTitle('RED — Write a Failing Test'), 'RED Write a Failing Test');
});