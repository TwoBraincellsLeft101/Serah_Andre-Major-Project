import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Appointment } from '../models/Appointment.js';
import { BusinessRuleError, ValidationError } from '../models/errors.js';
import { makeCustomer, makeAppointment, service, FUTURE } from './helpers.js';

const cust = makeCustomer(1);

describe('Appointment', () => {
  test('starts Pending and exposes values through getters', () => {
    const a = makeAppointment(cust, 5, FUTURE, 3);
    assert.equal(a.getStatus(), 'Pending'); assert.equal(a.appointmentId, 5); assert.equal(a.queueNumber, 3);
    assert.equal(a.customer, cust); assert.equal(a.serviceType, service); assert.equal(a.dateTime, FUTURE);
    assert.ok(a.isWaiting() && a.isActive());
  });
  test('constructor rejects bad id, customer, service, date, queue number and status', () => {
    assert.throws(() => new Appointment(0, cust, service, FUTURE, 1), ValidationError);
    assert.throws(() => new Appointment(1, null, service, FUTURE, 1), ValidationError);
    assert.throws(() => new Appointment(1, cust, {}, FUTURE, 1), ValidationError);
    assert.throws(() => new Appointment(1, cust, service, 'garbage', 1), ValidationError);
    assert.throws(() => new Appointment(1, cust, service, '2099-02-31T09:00', 1), ValidationError);
    assert.throws(() => new Appointment(1, cust, service, FUTURE, 0), ValidationError);
    assert.throws(() => new Appointment(1, cust, service, FUTURE, 1, 'Flying'), ValidationError);
  });
  test('valid life-cycle: Pending -> Confirmed -> Now Serving -> Completed', () => {
    const a = makeAppointment(cust);
    for (const s of ['Confirmed', 'Now Serving', 'Completed']) a.setStatus(s);
    assert.equal(a.getStatus(), 'Completed'); assert.ok(!a.isActive());
  });
  test('unknown status -> ValidationError; illegal move -> BusinessRuleError', () => {
    assert.throws(() => makeAppointment(cust).setStatus('Pendng'), ValidationError);
    assert.throws(() => makeAppointment(cust, 1, FUTURE, 1, 'Completed').setStatus('Pending'), /Cannot change status from "Completed" to "Pending"/);
    assert.throws(() => makeAppointment(cust).setStatus('Completed'), BusinessRuleError);   // must be served first
  });
  test('cancel() works while waiting; fails with a clear message once served, finished or cancelled', () => {
    const a = makeAppointment(cust); a.cancel(); assert.equal(a.getStatus(), 'Cancelled');
    assert.throws(() => a.cancel(), BusinessRuleError);
    assert.throws(() => makeAppointment(cust, 1, FUTURE, 1, 'Completed').cancel(), /can no longer be cancelled/);
    assert.throws(() => makeAppointment(cust, 1, FUTURE, 1, 'Now Serving').cancel(), BusinessRuleError);
  });
  test('every status can be used to restore an appointment', () => {
    for (const s of Appointment.ALLOWED_STATUSES) assert.equal(makeAppointment(cust, 1, FUTURE, 1, s).getStatus(), s);
  });
  test('toSummary() and toString()', () => {
    const a = makeAppointment(cust, 5, FUTURE, 3);
    assert.deepEqual(a.toSummary(), { id: 5, queueNumber: 3, customerName: 'Serah Morris', service: 'General Consultation', dateTime: FUTURE, status: 'Pending' });
    assert.match(a.toString(), /Q#3/);
  });
  test('JSON round trip keeps everything (customer and service stored by id)', () => {
    const a = makeAppointment(cust, 5, FUTURE, 3, 'Confirmed');
    const data = JSON.parse(JSON.stringify(a));
    assert.deepEqual(data, { appointmentId: 5, customerId: 1, serviceId: 1, dateTime: FUTURE, queueNumber: 3, status: 'Confirmed' });
    assert.deepEqual(Appointment.fromJSON(data, cust, service).toJSON(), data);
  });
  test('fromJSON rejects tampered data', () => {
    const good = makeAppointment(cust).toJSON();
    assert.throws(() => Appointment.fromJSON({ ...good, dateTime: 'yesterday' }, cust, service), ValidationError);
    assert.throws(() => Appointment.fromJSON({ ...good, status: 'Hacked' }, cust, service), ValidationError);
    assert.throws(() => Appointment.fromJSON({ ...good, queueNumber: -1 }, cust, service), ValidationError);
    assert.throws(() => Appointment.fromJSON(null, cust, service), ValidationError);
  });
});
