import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { QueueManager } from '../models/QueueManager.js';
import { Staff } from '../models/Staff.js';
import { BusinessRuleError, ValidationError } from '../models/errors.js';
import { makeCustomer, makeAppointment, FUTURE } from './helpers.js';

let qm, staff;
beforeEach(() => { QueueManager.resetInstance(); qm = QueueManager.getInstance(); staff = new Staff(100, 'Alex Rivera', 'alex@appointease.com', '0400000000', 'Front Desk'); });

/** Book n customers through the same steps the Controller uses. */
function bookCustomers(n) {
  return Array.from({ length: n }, (_, i) => {
    const c = makeCustomer(i + 1, `Customer ${'ABCDEFGH'[i]}`);
    const a = makeAppointment(c, i + 1, FUTURE, qm.generateQueueNumber(), undefined);
    a.setStatus('Confirmed'); c.bookAppointment(a); qm.addToQueue(a);
    return a;
  });
}

describe('Singleton', () => {
  test('getInstance() always returns the same object', () => assert.equal(QueueManager.getInstance(), QueueManager.getInstance()));
  test('calling the constructor a second time throws a BusinessRuleError', () => assert.throws(() => new QueueManager(), BusinessRuleError));
});

describe('Queue numbers and adding', () => {
  test('queue numbers are sequential and never repeat', () => {
    assert.deepEqual([qm.generateQueueNumber(), qm.generateQueueNumber(), qm.generateQueueNumber()], [1, 2, 3]);
    assert.equal(qm.getCurrentQueueNumber(), 3);
  });
  test('addToQueue rejects non-appointments (null, plain objects) and duplicates', () => {
    assert.throws(() => qm.addToQueue(null), ValidationError);
    assert.throws(() => qm.addToQueue({}), ValidationError);
    const [a] = bookCustomers(1);
    assert.throws(() => qm.addToQueue(a), BusinessRuleError);
    assert.equal(qm.getQueueList().length, 1);
  });
  test('getQueueList returns a copy', () => { bookCustomers(2); qm.getQueueList().pop(); assert.equal(qm.getQueueList().length, 2); });
});

describe('Calling the queue', () => {
  test('callNext serves in order, and completes the previous customer automatically', () => {
    const [a, b, c] = bookCustomers(3);
    assert.equal(staff.callNextCustomer(), a); assert.equal(a.getStatus(), 'Now Serving'); assert.equal(qm.getNowServing(), a);
    assert.equal(qm.getWaitingCount(), 2);
    assert.equal(staff.callNextCustomer(), b); assert.equal(a.getStatus(), 'Completed'); assert.equal(b.getStatus(), 'Now Serving');
    assert.equal(staff.callNextCustomer(), c); assert.equal(qm.getWaitingCount(), 0);
  });
  test('callNext on an empty queue returns null (no crash) and clears Now Serving', () => {
    const [a] = bookCustomers(1);
    staff.callNextCustomer();
    assert.equal(staff.callNextCustomer(), null);
    assert.equal(a.getStatus(), 'Completed'); assert.equal(qm.getNowServing(), null);
    assert.equal(new Staff(101, 'Sam Lee', 's@x.co', '0400000001').callNextCustomer(), null);
  });
  test('cancelled customers are skipped', () => {
    const [a, b] = bookCustomers(2);
    a.customer.cancelAppointment(a.appointmentId);
    assert.equal(staff.callNextCustomer(), b); assert.equal(qm.getWaitingCount(), 0);
  });
  test('staff can complete or no-show the customer being served, but not make an illegal change', () => {
    const [a, b] = bookCustomers(2);
    staff.callNextCustomer();
    assert.equal(staff.updateAppointmentStatus(a, 'Completed'), true);
    assert.throws(() => staff.updateAppointmentStatus(a, 'Pending'), BusinessRuleError);
    assert.throws(() => staff.updateAppointmentStatus(b, 'Nonsense'), ValidationError);
    assert.equal(staff.updateAppointmentStatus(null, 'Completed'), false);
    assert.deepEqual(staff.viewQueue(), [a, b]);
  });
});

describe('restore() (loading saved data)', () => {
  test('restores appointments, the counter and Now Serving', () => {
    const [a, b] = bookCustomers(2); staff.callNextCustomer();
    qm.restore(2, [a, b]);
    assert.equal(qm.getNowServing(), a); assert.equal(qm.generateQueueNumber(), 3);
  });
  test('counter can never fall below the highest queue number', () => {
    const [a, b] = bookCustomers(2); qm.restore(0, [a, b]); assert.equal(qm.generateQueueNumber(), 3);
  });
  test('rejects duplicate queue numbers, duplicate ids and two customers being served', () => {
    const c = makeCustomer();
    const x = makeAppointment(c, 1, FUTURE, 1), y = makeAppointment(c, 2, FUTURE, 1);
    assert.throws(() => qm.restore(2, [x, y]), /duplicate queue numbers/);
    assert.throws(() => qm.restore(2, [makeAppointment(c, 1, FUTURE, 1), makeAppointment(c, 1, FUTURE, 2)]), /duplicate appointment ids/);
    const s1 = makeAppointment(c, 1, FUTURE, 1, 'Now Serving'), s2 = makeAppointment(c, 2, FUTURE, 2, 'Now Serving');
    assert.throws(() => qm.restore(2, [s1, s2]), /more than one/);
  });
});
