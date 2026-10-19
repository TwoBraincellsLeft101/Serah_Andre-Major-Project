import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ServiceType } from '../models/ServiceType.js';
import { ValidationError } from '../models/errors.js';

describe('ServiceType', () => {
  test('getters, getDetails(), toString() and toJSON()', () => {
    const s = new ServiceType(4, ' Account Inquiry ', 20);
    assert.equal(s.serviceId, 4); assert.equal(s.serviceName, 'Account Inquiry'); assert.equal(s.estimatedDuration, 20);
    assert.deepEqual(s.getDetails(), { id: 4, name: 'Account Inquiry', duration: 20 });
    assert.equal(s.toString(), 'Account Inquiry (~20 min)');
    assert.deepEqual(JSON.parse(JSON.stringify(s)), { serviceId: 4, serviceName: 'Account Inquiry', estimatedDuration: 20 });
  });
  test('rejects a bad id, a missing name and non-positive or fractional durations', () => {
    assert.throws(() => new ServiceType(0, 'x', 10), ValidationError);
    assert.throws(() => new ServiceType(1, '  ', 10), ValidationError);
    for (const d of [0, -5, 1.5, '10', NaN]) assert.throws(() => new ServiceType(1, 'x', d), ValidationError);
  });
});
