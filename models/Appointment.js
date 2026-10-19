/**
 * Appointment.js
 * Demonstrates: Encapsulation (private fields + controlled setStatus)
 * Checkpoint 3: validated constructor, status life-cycle (state machine),
 * friendly errors, and JSON conversion (toJSON / fromJSON).
 */
import { BusinessRuleError, ValidationError } from './errors.js';
import { Validator } from '../utils/Validator.js';
import { ServiceType } from './ServiceType.js';

export class Appointment {
  #appointmentId;
  #customer;
  #serviceType;
  #dateTime;
  #status;
  #queueNumber;

  static ALLOWED_STATUSES = [
    'Pending',
    'Confirmed',
    'Now Serving',
    'Completed',
    'Cancelled',
    'No-show'
  ];

  /** Which status may follow which. Completed, Cancelled and No-show are final. */
  static TRANSITIONS = Object.freeze({
    'Pending': ['Confirmed', 'Now Serving', 'Cancelled', 'No-show'],
    'Confirmed': ['Now Serving', 'Cancelled', 'No-show'],
    'Now Serving': ['Completed', 'No-show'],
    'Completed': [],
    'Cancelled': [],
    'No-show': []
  });

  /**
   * @param {number} appointmentId  - positive whole number
   * @param {Customer} customer     - the customer who booked
   * @param {ServiceType} serviceType
   * @param {string} dateTime       - 'YYYY-MM-DDTHH:mm' (must be a real date)
   * @param {number} queueNumber    - positive whole number from QueueManager
   * @param {string} [status='Pending'] - used when restoring saved data
   * @throws {ValidationError}
   */
  constructor(appointmentId, customer, serviceType, dateTime, queueNumber, status = 'Pending') {
    if (!Number.isInteger(appointmentId) || appointmentId < 1) throw new ValidationError('Invalid appointment id.', 'appointmentId');
    if (!customer || typeof customer.getName !== 'function') throw new ValidationError('An appointment must belong to a customer.', 'customer');
    if (!(serviceType instanceof ServiceType)) throw new ValidationError('Please select a valid service.', 'service');
    Validator.dateTimeFormat(dateTime);   // throws if not a real 'YYYY-MM-DDTHH:mm'
    if (!Number.isInteger(queueNumber) || queueNumber < 1) throw new ValidationError('Queue number must be a positive whole number.', 'queueNumber');
    if (!Appointment.ALLOWED_STATUSES.includes(status)) throw new ValidationError(`Unknown status "${status}".`, 'status');

    this.#appointmentId = appointmentId;
    this.#customer = customer;
    this.#serviceType = serviceType;
    this.#dateTime = String(dateTime).trim();
    this.#status = status;
    this.#queueNumber = queueNumber;
  }

  get appointmentId() {
    return this.#appointmentId;
  }

  get customer() {
    return this.#customer;
  }

  get serviceType() {
    return this.#serviceType;
  }

  get dateTime() {
    return this.#dateTime;
  }

  get queueNumber() {
    return this.#queueNumber;
  }

  getStatus() {
    return this.#status;
  }

  /** @returns {boolean} true while the customer is still waiting (Pending or Confirmed) */
  isWaiting() {
    return this.#status === 'Pending' || this.#status === 'Confirmed';
  }

  /** @returns {boolean} true while the appointment still occupies its time (waiting or being served) */
  isActive() {
    return this.isWaiting() || this.#status === 'Now Serving';
  }

  /**
   * Controlled setter - only valid statuses, and only valid moves.
   * @param {string} newStatus
   * @throws {ValidationError}   if newStatus is not a known status
   * @throws {BusinessRuleError} if the move is not allowed from the current status
   */
  setStatus(newStatus) {
    if (!Appointment.ALLOWED_STATUSES.includes(newStatus)) {
      throw new ValidationError(`Invalid status: ${newStatus}. Allowed: ${Appointment.ALLOWED_STATUSES.join(', ')}`, 'status');
    }
    if (!Appointment.TRANSITIONS[this.#status].includes(newStatus)) {
      throw new BusinessRuleError(`Cannot change status from "${this.#status}" to "${newStatus}".`);
    }
    this.#status = newStatus;
  }

  /**
   * Cancel the appointment (only possible while the customer is still waiting).
   * @throws {BusinessRuleError} if it is being served, finished or already cancelled
   */
  cancel() {
    if (!this.isWaiting()) {
      throw new BusinessRuleError(`This appointment is "${this.#status}" and can no longer be cancelled.`);
    }
    this.setStatus('Cancelled');
  }

  toSummary() {
    return {
      id: this.#appointmentId,
      queueNumber: this.#queueNumber,
      customerName: this.#customer.getName(),
      service: this.#serviceType.serviceName,
      dateTime: this.#dateTime,
      status: this.#status
    };
  }

  toString() {
    return `Q#${this.#queueNumber} – ${this.#customer.getName()} – ${this.#serviceType.serviceName} [${this.#status}]`;
  }

  /**
   * Called by JSON.stringify(). The customer and service are stored by id only
   * (avoids duplicated data and circular references).
   */
  toJSON() {
    return {
      appointmentId: this.#appointmentId,
      customerId: this.#customer.id,
      serviceId: this.#serviceType.serviceId,
      dateTime: this.#dateTime,
      queueNumber: this.#queueNumber,
      status: this.#status
    };
  }

  /**
   * Rebuild an Appointment from parsed JSON (the result of toJSON()).
   * @param {object} data
   * @param {Customer} customer         - the already-restored owner
   * @param {ServiceType} serviceType   - the matching service
   * @returns {Appointment}
   * @throws {ValidationError} if the stored data is invalid
   */
  static fromJSON(data, customer, serviceType) {
    if (!data || typeof data !== 'object') throw new ValidationError('Saved appointment is malformed.');
    return new Appointment(data.appointmentId, customer, serviceType, data.dateTime, data.queueNumber, data.status);
  }
}
