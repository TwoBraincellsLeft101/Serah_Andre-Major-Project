import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Validator, PATTERNS } from '../utils/Validator.js';
import { ValidationError } from '../models/errors.js';
import { NOW } from './helpers.js';

const rejects = (fn, field) => assert.throws(fn, (e) => e instanceof ValidationError && (!field || e.field === field));

describe('Validator.name', () => {
  test('accepts normal, hyphenated, apostrophe and accented names', () => {
    for (const n of ['Serah Morris', 'Mary-Jane', "O'Neil", 'José Álvarez', 'Al']) assert.equal(Validator.name(n), n);
  });
  test('trims and collapses extra spaces', () => assert.equal(Validator.name('  Andre   Banvuhavuha '), 'Andre Banvuhavuha'));
  test('rejects empty, one letter, digits, symbols and HTML', () => {
    for (const n of ['', '   ', 'A', 'John3', '<img src=x onerror=alert(1)>', '-Anna', 'x'.repeat(60)]) rejects(() => Validator.name(n), 'name');
  });
  test('null and undefined do not crash', () => { rejects(() => Validator.name(null)); rejects(() => Validator.name(undefined)); });
});

describe('Validator.email', () => {
  test('accepts valid emails and lower-cases them', () => {
    assert.equal(Validator.email(' Serah.Morris+test@Example.co.vu '), 'serah.morris+test@example.co.vu');
  });
  test('rejects invalid emails', () => {
    for (const e of ['', 'plain', 'a@b', '@x.com', 'a@.com', 'a b@x.com', 'a@x..com', 'a..b@x.com', 'a@x.c', 'a@b..c']) rejects(() => Validator.email(e), 'email');
  });
});

describe('Validator.phone', () => {
  test('accepts local (incl. 7-digit), international and formatted numbers', () => {
    for (const p of ['0411111111', '0412 345 678', '0411-111-111', '5551234', '+678 555 1234', '+61 411 111 111', '+6785551234']) assert.equal(Validator.phone(p), p);
  });
  test('rejects letters, too short, too long and misplaced symbols', () => {
    for (const p of ['', '123', 'abc', '04a1111111', '1234567890123456', '(041) 111 1111', '++678 5551234', '555 12']) rejects(() => Validator.phone(p), 'phone');
  });
});

describe('Validator.dateTimeFormat / dateTime', () => {
  test('dateTimeFormat accepts a real date and returns a Date', () => {
    const d = Validator.dateTimeFormat('2026-10-19T09:30');
    assert.ok(d instanceof Date); assert.equal(d.getHours(), 9); assert.equal(d.getMinutes(), 30);
  });
  test('rejects empty, wrong formats and impossible dates (31 Feb, month 13)', () => {
    for (const v of ['', 'garbage', '19/10/2026 09:00', '2026-10-19', '2026-10-19 09:00', '2027-02-31T09:00', '2026-13-01T09:00', '2026-10-19T25:00'])
      rejects(() => Validator.dateTimeFormat(v), 'dateTime');
  });
  test('dateTime accepts the future and rejects the past or the exact current moment', () => {
    assert.ok(Validator.dateTime('2026-10-15T09:30', NOW) instanceof Date);
    rejects(() => Validator.dateTime('2026-10-15T08:30', NOW), 'dateTime');
    rejects(() => Validator.dateTime('2026-10-15T09:00', NOW), 'dateTime');
    rejects(() => Validator.dateTime('2020-01-01T09:00', NOW), 'dateTime');
  });
});

describe('PATTERNS', () => {
  test('are real regular expressions', () => { for (const p of Object.values(PATTERNS)) assert.ok(p instanceof RegExp); });
});
