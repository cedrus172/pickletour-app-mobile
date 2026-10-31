/* global __dirname */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../utils/tournamentPresentation.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const fixture = { exports: {} };
new Function('module', 'exports', compiled)(fixture, fixture.exports);
const { tournamentDateParts, tournamentDateLabel } = fixture.exports;

test('API start time is shown in Vietnam time without substituting the mockup time', () => {
  assert.deepEqual(tournamentDateParts('2026-11-15T00:30:19.000Z'), {
    day: '15', month: '11', date: '15/11/2026', time: '07:30', label: '07:30 · 15/11/2026',
  });
});

test('midnight and UTC day rollover retain the correct badge date', () => {
  assert.equal(tournamentDateParts('2026-11-14T17:00:00.000Z').label, '00:00 · 15/11/2026');
  assert.equal(tournamentDateParts('2026-12-31T18:30:00.000Z').date, '01/01/2027');
});

test('missing and invalid dates never create a NaN badge or range', () => {
  for (const input of [undefined, null, '', 'invalid', new Date(NaN)]) {
    assert.equal(tournamentDateParts(input), null);
    assert.equal(tournamentDateLabel(input, '2026-11-15'), null);
  }
});

test('multi-day tournaments keep the end date while same-day tournaments stay compact', () => {
  const start = '2026-11-15T00:30:19.000Z';
  assert.equal(tournamentDateLabel(start, '2026-11-15T16:59:19.000Z'), '07:30 · 15/11/2026');
  assert.equal(tournamentDateLabel(start, '2026-11-16T16:59:19.000Z'), '07:30 · 15/11/2026\n– 16/11/2026');
  assert.equal(tournamentDateLabel(start, 'invalid'), '07:30 · 15/11/2026');
});
