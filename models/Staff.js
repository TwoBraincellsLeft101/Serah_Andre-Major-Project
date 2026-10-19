/**
 * Staff.js - Extends Person
 * Demonstrates: Inheritance (extends + super())
 * Checkpoint 3: role is validated.
 */
import { Person } from './Person.js';
import { QueueManager } from './QueueManager.js';
import { ValidationError } from './errors.js';

const ROLES = ['Front Desk', 'Service Agent', 'Supervisor'];

export class Staff extends Person {
  #role;

  /**
   * @param {number} id
   * @param {string} name
   * @param {string} email
   * @param {string} phone
   * @param {string} [role='Service Agent'] - one of ROLES
   * @throws {ValidationError}
   */
  constructor(id, name, email, phone, role = 'Service Agent') {
    super(id, name, email, phone);
    if (!ROLES.includes(role)) throw new ValidationError(`Role must be one of: ${ROLES.join(', ')}.`, 'role');
    this.#role = role;
  }

  getRole() {
    return this.#role;
  }

  /**
   * Call the next customer in the queue
   * @returns {Appointment|null} The appointment now being served (null if nobody is waiting)
   */
  callNextCustomer() {
    const qm = QueueManager.getInstance();
    return qm.callNext();
  }

  /**
   * Update status of a specific appointment
   * @returns {boolean} false if the argument is not an appointment
   * @throws {ValidationError|BusinessRuleError} if the status or the move is not allowed
   */
  updateAppointmentStatus(appointment, newStatus) {
    if (appointment && typeof appointment.setStatus === 'function') {
      appointment.setStatus(newStatus);
      return true;
    }
    return false;
  }

  /**
   * View the current live queue
   */
  viewQueue() {
    const qm = QueueManager.getInstance();
    return qm.getQueueList();
  }
}
