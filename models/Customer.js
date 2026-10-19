/**
 * Customer.js - Extends Person
 * Demonstrates: Inheritance (extends + super()), Encapsulation
 * Checkpoint 3: booking rules (future date, no double-booking, own appointments only).
 */
import { Person } from './Person.js';
import { Appointment } from './Appointment.js';
import { Validator } from '../utils/Validator.js';
import { BusinessRuleError, ValidationError } from './errors.js';

export class Customer extends Person {
  #appointments; // private array of Appointment objects

  constructor(id, name, email, phone) {
    super(id, name, email, phone); // call parent constructor (validates the input)
    this.#appointments = [];
  }

  /**
   * Check that this customer has no active appointment at the given time.
   * The Controller calls this BEFORE a queue number is issued, so a refused
   * booking never leaves a gap in the queue numbers.
   * @param {string} dateTime - 'YYYY-MM-DDTHH:mm'
   * @throws {BusinessRuleError} if the customer is already booked at that time
   */
  assertSlotFree(dateTime) {
    if (this.#appointments.some(a => a.isActive() && a.dateTime === dateTime)) {
      throw new BusinessRuleError('You already have an appointment at that time.');
    }
  }

  /**
   * Add a NEW appointment to this customer.
   * @param {Appointment} appointment
   * @param {Date} [now=new Date()] - injectable clock (for tests)
   * @returns {Appointment}
   * @throws {ValidationError}   not an Appointment, or the date is not in the future
   * @throws {BusinessRuleError} belongs to someone else, or double-booking
   */
  bookAppointment(appointment, now = new Date()) {
    if (!(appointment instanceof Appointment)) throw new ValidationError('Invalid appointment.', 'appointment');
    if (appointment.customer !== this) throw new BusinessRuleError('This appointment belongs to a different customer.');
    Validator.dateTime(appointment.dateTime, now);
    this.assertSlotFree(appointment.dateTime);
    this.#appointments.push(appointment);
    return appointment;
  }

  /**
   * Re-attach an appointment loaded from storage (the "future date" rule is not
   * applied to old bookings).
   * @param {Appointment} appointment
   * @throws {BusinessRuleError} if it belongs to someone else
   */
  restoreAppointment(appointment) {
    if (appointment.customer !== this) throw new BusinessRuleError('This appointment belongs to a different customer.');
    this.#appointments.push(appointment);
  }

  /**
   * Cancel one of this customer's appointments.
   * @param {number} appointmentId
   * @returns {boolean} true if cancelled, false if no such appointment
   * @throws {BusinessRuleError} if it can no longer be cancelled (e.g. Completed)
   */
  cancelAppointment(appointmentId) {
    const appt = this.#appointments.find(a => a.appointmentId === appointmentId);
    if (appt) {
      appt.cancel();
      return true;
    }
    return false;
  }

  viewStatus(appointmentId) {
    const appt = this.#appointments.find(a => a.appointmentId === appointmentId);
    return appt ? appt.getStatus() : null;
  }

  getAppointments() {
    return [...this.#appointments]; // return a copy to preserve encapsulation
  }

  getUpcomingAppointments() {
    return this.#appointments.filter(a => a.isWaiting());
  }
}
