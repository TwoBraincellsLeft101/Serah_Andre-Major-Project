import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { QueueManager } from '../models/QueueManager.js';
import { Staff } from '../models/Staff.js';
import { BusinessRuleError, ValidationError } from '../models/errors.js';
import { makeCustomer, makeAppointment, FUTURE, FUTURE2, NOW } from './helpers.js';

beforeEach(() => QueueManager.resetInstance());

describe('Customer booking and cancelling', () => {
  test('bookAppointment stores the appointment and returns it', () => {
    const c = makeCustomer(); const a = makeAppointment(c);
    assert.equal(c.bookAppointment(a), a);
    assert.deepEqual(c.getAppointments(), [a]); assert.equal(c.viewStatus(1), 'Pending'); assert.equal(c.viewStatus(99), null);
  });
  test('getAppointments() returns a copy', () => {
    const c = makeCustomer(); c.bookAppointment(makeAppointment(c)); c.getAppointments().pop();
    assert.equal(c.getAppointments().length, 1);
  });
  test('rejects a booking in the past (injected clock) but accepts the future', () => {
    const c = makeCustomer();
    assert.throws(() => c.bookAppointment(makeAppointment(c, 1, '2026-10-15T08:00'), NOW), /future/);
    assert.doesNotThrow(() => c.bookAppointment(makeAppointment(c, 2, '2026-10-15T10:00'), NOW));
  });
  test('rejects things that are not appointments, and appointments owned by someone else', () => {
    const c1 = makeCustomer(1), c2 = makeCustomer(2);
    assert.throws(() => c1.bookAppointment({}), ValidationError);
    assert.throws(() => c1.bookAppointment(null), ValidationError);
    assert.throws(() => c1.bookAppointment(makeAppointment(c2)), /different customer/);
  });
  test('no double-booking at the same time, but a different time or a rebook after cancelling is fine', () => {
    const c = makeCustomer();
    c.bookAppointment(makeAppointment(c, 1, FUTURE));
    assert.throws(() => c.bookAppointment(makeAppointment(c, 2, FUTURE)), /already have an appointment/);
    assert.throws(() => c.assertSlotFree(FUTURE), BusinessRuleError);
    assert.doesNotThrow(() => c.assertSlotFree(FUTURE2));
    assert.doesNotThrow(() => c.bookAppointment(makeAppointment(c, 3, FUTURE2)));
    assert.equal(c.cancelAppointment(1), true);
    assert.doesNotThrow(() => c.bookAppointment(makeAppointment(c, 4, FUTURE)));
  });
  test('cancelAppointment: true when cancelled, false when unknown', () => {
    const c = makeCustomer(); c.bookAppointment(makeAppointment(c));
    assert.equal(c.cancelAppointment(99), false);
    assert.equal(c.cancelAppointment(1), true); assert.equal(c.viewStatus(1), 'Cancelled');
  });
  test('a finished appointment cannot be cancelled and keeps its status', () => {
    const c = makeCustomer(); const a = makeAppointment(c); c.bookAppointment(a);
    for (const s of ['Confirmed', 'Now Serving', 'Completed']) a.setStatus(s);
    assert.throws(() => c.cancelAppointment(1), /can no longer be cancelled/);
    assert.equal(a.getStatus(), 'Completed');
  });
  test('getUpcomingAppointments returns only Pending/Confirmed', () => {
    const c = makeCustomer(); const a = makeAppointment(c, 1, FUTURE), b = makeAppointment(c, 2, FUTURE2);
    c.bookAppointment(a); c.bookAppointment(b); a.setStatus('Cancelled');
    assert.deepEqual(c.getUpcomingAppointments(), [b]);
  });
  test('restoreAppointment re-attaches old appointments without the future-date rule', () => {
    const c = makeCustomer(); const old = makeAppointment(c, 1, '2020-01-06T09:00', 1, 'Completed');
    c.restoreAppointment(old); assert.deepEqual(c.getAppointments(), [old]);
    assert.throws(() => c.restoreAppointment(makeAppointment(makeCustomer(2))), BusinessRuleError);
  });
});
