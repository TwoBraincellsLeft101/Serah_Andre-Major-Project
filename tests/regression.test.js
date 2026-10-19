/**
 * Regression tests - one per defect found while testing the Checkpoint 2 prototype.
 * They use ONLY the public API that already existed in Checkpoint 2, so the same file
 * can be run against the old code (every test fails = the defect exists) and the new
 * code (every test passes = the defect is fixed). Defect ids (BUG-xx) match the report.
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Customer } from '../models/Customer.js';
import { Appointment } from '../models/Appointment.js';
import { ServiceType } from '../models/ServiceType.js';
import { QueueManager } from '../models/QueueManager.js';

const svc = new ServiceType(1, 'General Consultation', 15);
const cust = (id = 1) => new Customer(id, 'Serah Morris', `user${id}@example.com`, '0411111111');
const appt = (id, c, dateTime = '2099-06-15T09:00') => new Appointment(id, c, svc, dateTime, id);
beforeEach(() => QueueManager.resetInstance());

describe('Regression: defects found in the Checkpoint 2 prototype', () => {
  test('BUG-01 a customer with an invalid email must be rejected', () =>
    assert.throws(() => new Customer(1, 'Serah Morris', 'not-an-email', '0411111111')));
  test('BUG-02 a blank name or an invalid phone number must be rejected', () => {
    assert.throws(() => new Customer(1, '   ', 'a@b.co', '0411111111'));
    assert.throws(() => new Customer(1, 'Serah Morris', 'a@b.co', 'abc'));
  });
  test('BUG-03 an appointment with a nonsense date must be rejected', () =>
    assert.throws(() => appt(1, cust(), 'garbage')));
  test('BUG-04 booking in the past must be rejected', () => {
    const c = cust(); assert.throws(() => c.bookAppointment(appt(1, c, '2020-01-06T09:00')));
  });
  test('BUG-05 a customer must not double-book the same time', () => {
    const c = cust(); c.bookAppointment(appt(1, c));
    assert.throws(() => c.bookAppointment(appt(2, c)));
  });
  test("BUG-06 a customer must not be given another customer's appointment", () => {
    const c1 = cust(1), c2 = cust(2);
    assert.throws(() => c1.bookAppointment(appt(1, c2)));
  });
  test('BUG-07 a finished appointment must not go back to Pending', () => {
    const a = appt(1, cust());
    a.setStatus('Confirmed'); a.setStatus('Now Serving'); a.setStatus('Completed');
    assert.throws(() => a.setStatus('Pending'));
    assert.equal(a.getStatus(), 'Completed');
  });
  test('BUG-08 a Completed appointment must not be cancellable', () => {
    const c = cust(); const a = appt(1, c); c.bookAppointment(a);
    a.setStatus('Confirmed'); a.setStatus('Now Serving'); a.setStatus('Completed');
    assert.throws(() => c.cancelAppointment(1));
    assert.equal(a.getStatus(), 'Completed');
  });
  test('BUG-09 a service with a negative duration must be rejected', () =>
    assert.throws(() => new ServiceType(9, 'Broken', -5)));
  test('BUG-10 the queue must refuse junk, which would crash callNext() later', () => {
    const qm = QueueManager.getInstance();
    assert.throws(() => qm.addToQueue(null));
  });
  test('BUG-11 JSON.stringify(customer / appointment) must contain their data (private fields were lost)', () => {
    const c = cust();
    assert.equal(JSON.parse(JSON.stringify(c)).email, 'user1@example.com');
    assert.equal(JSON.parse(JSON.stringify(appt(1, c))).queueNumber, 1);
  });
});
