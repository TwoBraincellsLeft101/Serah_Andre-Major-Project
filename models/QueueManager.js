/**
 * QueueManager.js - Singleton Design Pattern
 * Guarantees only one shared queue instance for the entire application.
 * Checkpoint 3: input checks, friendly errors, JSON conversion (toJSON / restore).
 */
import { Appointment } from './Appointment.js';
import { BusinessRuleError, ValidationError } from './errors.js';

export class QueueManager {
  static #instance = null;

  #queueList;          // array of Appointment objects currently waiting / being served
  #currentQueueNumber; // sequential counter
  #nowServing;         // the Appointment currently being served (or null)

  constructor() {
    if (QueueManager.#instance) {
      throw new BusinessRuleError('QueueManager is a Singleton. Use QueueManager.getInstance() instead of new.');
    }
    this.#queueList = [];
    this.#currentQueueNumber = 0;
    this.#nowServing = null;
    QueueManager.#instance = this;
  }

  /**
   * Returns the single shared instance
   */
  static getInstance() {
    if (!QueueManager.#instance) {
      QueueManager.#instance = new QueueManager();
    }
    return QueueManager.#instance;
  }

  /**
   * Generate the next sequential queue number
   */
  generateQueueNumber() {
    this.#currentQueueNumber += 1;
    return this.#currentQueueNumber;
  }

  /**
   * Add a newly booked appointment to the live queue
   * @param {Appointment} appointment
   * @returns {Appointment}
   * @throws {ValidationError}   if it is not an Appointment
   * @throws {BusinessRuleError} if it is already in the queue
   */
  addToQueue(appointment) {
    if (!(appointment instanceof Appointment)) throw new ValidationError('Only appointments can join the queue.');
    if (this.#queueList.includes(appointment)) throw new BusinessRuleError('That appointment is already in the queue.');
    this.#queueList.push(appointment);
    return appointment;
  }

  /**
   * Call the next waiting customer.
   * Marks the previous "Now Serving" customer as Completed, then moves the next
   * waiting customer to "Now Serving".
   * @returns {Appointment|null} the appointment now being served, or null if nobody is waiting
   */
  callNext() {
    // First mark previous "Now Serving" as Completed if any
    if (this.#nowServing && this.#nowServing.getStatus() === 'Now Serving') {
      this.#nowServing.setStatus('Completed');
    }

    // Find the next Pending / Confirmed appointment
    const nextAppt = this.#queueList.find(a => a.isWaiting());

    if (!nextAppt) {
      this.#nowServing = null;
      return null;
    }

    nextAppt.setStatus('Now Serving');
    this.#nowServing = nextAppt;

    // We keep it in the list so the live queue can still show "Now Serving"
    return nextAppt;
  }

  getQueueList() {
    // Return a shallow copy so external code cannot mutate the internal array
    return [...this.#queueList];
  }

  getNowServing() {
    return this.#nowServing;
  }

  getWaitingCount() {
    return this.#queueList.filter(a => a.isWaiting()).length;
  }

  /** @returns {number} the last queue number issued */
  getCurrentQueueNumber() {
    return this.#currentQueueNumber;
  }

  /** @returns {{currentQueueNumber:number, appointments:object[]}} used by JSON.stringify() */
  toJSON() {
    return { currentQueueNumber: this.#currentQueueNumber, appointments: this.#queueList.map(a => a.toJSON()) };
  }

  /**
   * Replace the queue contents with data loaded from storage. The Singleton
   * object stays the same - only its internal state is replaced.
   * @param {number} currentQueueNumber - saved counter
   * @param {Appointment[]} appointments
   * @throws {ValidationError} if queue numbers / ids repeat, or two customers are "Now Serving"
   */
  restore(currentQueueNumber, appointments) {
    const numbers = appointments.map(a => a.queueNumber);
    const ids = appointments.map(a => a.appointmentId);
    if (new Set(numbers).size !== numbers.length) throw new ValidationError('Saved data contains duplicate queue numbers.');
    if (new Set(ids).size !== ids.length) throw new ValidationError('Saved data contains duplicate appointment ids.');
    const serving = appointments.filter(a => a.getStatus() === 'Now Serving');
    if (serving.length > 1) throw new ValidationError('Saved data has more than one customer being served.');

    // The counter can never be lower than the highest number already issued.
    this.#currentQueueNumber = Math.max(Number(currentQueueNumber) || 0, ...numbers, 0);
    this.#queueList = [...appointments];
    this.#nowServing = serving[0] ?? null;
  }

  // Useful for testing / resetting
  static resetInstance() {
    QueueManager.#instance = null;
  }
}
