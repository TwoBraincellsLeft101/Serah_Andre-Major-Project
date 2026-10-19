// Shared test helpers. Far-future dates keep the tests valid no matter when they are run;
// an injected "now" is used where the exact current time matters.
import { Customer } from '../models/Customer.js';
import { Appointment } from '../models/Appointment.js';
import { ServiceType } from '../models/ServiceType.js';

export const FUTURE = '2099-06-15T09:00';
export const FUTURE2 = '2099-06-15T09:30';
export const NOW = new Date(2026, 9, 15, 9, 0); // 15 Oct 2026, 09:00
export const service = new ServiceType(1, 'General Consultation', 15);
export const service2 = new ServiceType(2, 'Specialist Appointment', 30);
export const serviceTypes = [service, service2];

/** A valid customer; id n gets its own email. */
export const makeCustomer = (id = 1, name = 'Serah Morris') => new Customer(id, name, `user${id}@example.com`, '0411111111');

/** A valid appointment object (not yet attached to a customer or the queue). */
export const makeAppointment = (customer, id = 1, dateTime = FUTURE, queueNumber = id, status) =>
  new Appointment(id, customer, service, dateTime, queueNumber, status);
