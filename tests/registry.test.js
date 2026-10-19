import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CustomerRegistry } from '../models/CustomerRegistry.js';
import { BusinessRuleError, ValidationError } from '../models/errors.js';

describe('CustomerRegistry', () => {
  test('registers customers with sequential ids', () => {
    const r = new CustomerRegistry();
    assert.equal(r.register('Serah Morris', 'serah@example.com', '0411111111').id, 1);
    assert.equal(r.register('Andre B', 'andre@example.com', '0422222222').id, 2);
    assert.equal(r.getAll().length, 2);
  });
  test('rejects a duplicate email whatever its case or spacing', () => {
    const r = new CustomerRegistry(); r.register('Serah Morris', 'serah@example.com', '0411111111');
    assert.throws(() => r.register('Someone Else', '  SERAH@example.com ', '0433333333'), /already exists/);
    assert.equal(r.getAll().length, 1);
  });
  test('invalid input creates nobody and does not use up an id', () => {
    const r = new CustomerRegistry();
    assert.throws(() => r.register('Serah', 'bad', '0411111111'), ValidationError);
    assert.throws(() => r.register('<b>', 'serah@example.com', '0411111111'), ValidationError);
    assert.throws(() => r.register('Serah', 'serah@example.com', 'x'), ValidationError);
    assert.equal(r.getAll().length, 0);
    assert.equal(r.register('Serah', 'serah@example.com', '0411111111').id, 1);
  });
  test('findByEmail / findById', () => {
    const r = new CustomerRegistry(); const c = r.register('Serah Morris', 'serah@example.com', '0411111111');
    assert.equal(r.findByEmail(' SERAH@example.com '), c); assert.equal(r.findById(1), c);
    assert.equal(r.findByEmail('x@y.co'), undefined); assert.equal(r.findByEmail(undefined), undefined); assert.equal(r.findById(9), undefined);
  });
  test('JSON round trip and rejection of malformed data', () => {
    const r = new CustomerRegistry(); r.register('Serah Morris', 'serah@example.com', '0411111111');
    const r2 = new CustomerRegistry(); r2.restore(JSON.parse(JSON.stringify(r)));
    assert.deepEqual(r2.toJSON(), r.toJSON()); assert.equal(r2.register('New Person', 'new@example.com', '0411111111').id, 2);
    assert.throws(() => new CustomerRegistry().restore(null), ValidationError);
    assert.throws(() => new CustomerRegistry().restore({ customers: [{ id: 1, name: 'X', email: 'bad', phone: '1' }] }), ValidationError);
    const dup = { id: 1, name: 'Serah Morris', email: 'serah@example.com', phone: '0411111111' };
    assert.throws(() => new CustomerRegistry().restore({ customers: [dup, { ...dup, id: 2 }] }), /duplicate email/);
    assert.throws(() => new CustomerRegistry().restore({ customers: [dup, { ...dup, email: 'b@example.com' }] }), /duplicate customer ids/);
  });
});
