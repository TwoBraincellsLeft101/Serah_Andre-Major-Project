import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Person } from '../models/Person.js';
import { Customer } from '../models/Customer.js';
import { Staff } from '../models/Staff.js';
import { ValidationError } from '../models/errors.js';

const goodCustomer = () => new Customer(1, 'Serah Morris', 'serah@example.com', '0411111111');

describe('Person / Customer / Staff', () => {
  test('inheritance: Customer and Staff are Persons and share id, getName() and getContact()', () => {
    const c = goodCustomer(); const s = new Staff(100, 'Alex Rivera', 'alex@appointease.com', '0400000000', 'Front Desk');
    assert.ok(c instanceof Person && s instanceof Person);
    assert.equal(c.id, 1); assert.equal(c.getName(), 'Serah Morris');
    assert.deepEqual(s.getContact(), { email: 'alex@appointease.com', phone: '0400000000' });
    assert.equal(s.getRole(), 'Front Desk'); assert.equal(c.toString(), 'Serah Morris (serah@example.com)');
  });
  test('constructor validates id, name, email and phone', () => {
    assert.throws(() => new Customer(1, 'S', 'serah@example.com', '0411111111'), ValidationError);
    assert.throws(() => new Customer(1, 'Serah', 'not-an-email', '0411111111'), ValidationError);
    assert.throws(() => new Customer(1, 'Serah', 'serah@example.com', 'abc'), ValidationError);
    for (const id of [0, -1, 1.5, '1', null]) assert.throws(() => new Customer(id, 'Serah', 'serah@example.com', '0411111111'), ValidationError);
  });
  test('Staff validates its role', () => {
    assert.throws(() => new Staff(1, 'Alex', 'alex@example.com', '0400000000', 'Boss'), ValidationError);
    assert.equal(new Staff(1, 'Alex', 'alex@example.com', '0400000000').getRole(), 'Service Agent');
  });
  test('encapsulation: private fields are not reachable from outside', () => {
    const c = goodCustomer();
    assert.equal(c.name, undefined); assert.equal(c.email, undefined); assert.deepEqual(Object.keys(c), []);
    assert.throws(() => { c.id = 99; }, TypeError);   // getter only: cannot be assigned
    assert.equal(c.id, 1);
  });
  test('getContact() returns a copy: changing it does not change the customer', () => {
    const c = goodCustomer(); c.getContact().email = 'hacker@evil.com';
    assert.equal(c.getContact().email, 'serah@example.com');
  });
  test('setContact(): updates only what is supplied, validates, and is all-or-nothing', () => {
    const c = goodCustomer();
    c.setContact('new@example.com');
    assert.deepEqual(c.getContact(), { email: 'new@example.com', phone: '0411111111' });
    c.setContact(undefined, '0499999999');
    assert.deepEqual(c.getContact(), { email: 'new@example.com', phone: '0499999999' });
    assert.throws(() => c.setContact('another@example.com', 'bad'), ValidationError);
    assert.deepEqual(c.getContact(), { email: 'new@example.com', phone: '0499999999' });   // unchanged
  });
  test('JSON.stringify includes the private data through toJSON()', () => {
    assert.deepEqual(JSON.parse(JSON.stringify(goodCustomer())), { id: 1, name: 'Serah Morris', email: 'serah@example.com', phone: '0411111111' });
  });
});
