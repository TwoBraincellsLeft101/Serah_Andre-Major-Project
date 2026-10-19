/**
 * StorageService.js (new in Checkpoint 3)
 * Saves and loads the whole application as JSON in the browser (localStorage).
 *
 *   SAVE: objects --JSON.stringify()--> text --> localStorage
 *         (each class supplies toJSON(), so private # fields are included)
 *   LOAD: localStorage --> text --JSON.parse()--> plain data
 *         --> validated and rebuilt into real Customer / Appointment objects
 */
import { StorageError, AppError } from '../models/errors.js';
import { CustomerRegistry } from '../models/CustomerRegistry.js';
import { QueueManager } from '../models/QueueManager.js';
import { Appointment } from '../models/Appointment.js';

export const STORAGE_KEY = 'appointease.data';
export const SCHEMA_VERSION = 1;

/** In-memory stand-in for localStorage (used by unit tests, or if the browser blocks storage). */
export class MemoryStorage {
  #data = new Map();
  getItem(key) { return this.#data.has(key) ? this.#data.get(key) : null; }
  setItem(key, value) { this.#data.set(key, String(value)); }
  removeItem(key) { this.#data.delete(key); }
}

export class StorageService {
  #storage;
  #key;

  /**
   * @param {Storage|MemoryStorage} [storage] - defaults to localStorage (or memory if unavailable)
   * @param {string} [key=STORAGE_KEY]
   */
  constructor(storage = StorageService.defaultStorage(), key = STORAGE_KEY) {
    this.#storage = storage;
    this.#key = key;
  }

  /** @returns {Storage|MemoryStorage} localStorage if it works, otherwise a MemoryStorage */
  static defaultStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('__appointease_test__', '1');
        localStorage.removeItem('__appointease_test__');
        return localStorage;
      }
    } catch { /* storage blocked (e.g. private mode) - fall through */ }
    return new MemoryStorage();
  }

  /**
   * Save the current application state.
   * @param {CustomerRegistry} registry
   * @param {QueueManager} queue
   * @throws {StorageError} if the browser refuses to store the data (e.g. quota full)
   */
  save(registry, queue) {
    try {
      const text = JSON.stringify({ version: SCHEMA_VERSION, savedAt: new Date().toISOString(), registry, queue });
      this.#storage.setItem(this.#key, text);
    } catch {
      throw new StorageError('Your changes could not be saved in this browser. They will be lost when the page is closed.');
    }
  }

  /**
   * Load saved state, if any.
   * @param {ServiceType[]} serviceTypes - the service catalogue (appointments refer to services by id)
   * @returns {{registry: CustomerRegistry, queue: QueueManager}|null} null when nothing is saved yet
   * @throws {StorageError} if the saved text is corrupt or invalid. The bad data is moved to
   *         "<key>.corrupt" (not destroyed) so the app can start fresh.
   */
  load(serviceTypes) {
    const text = this.#storage.getItem(this.#key);
    if (text === null) return null;
    try {
      const data = JSON.parse(text); // throws SyntaxError on malformed JSON
      if (!data || typeof data !== 'object' || data.version !== SCHEMA_VERSION) {
        throw new StorageError('unsupported data version');
      }
      return this.#hydrate(data, serviceTypes);
    } catch (error) {
      this.#quarantine(text);
      const detail = error instanceof AppError ? ` (${error.message})` : '';
      throw new StorageError(`Saved data could not be read${detail}. A backup was kept and the app has started fresh.`);
    }
  }

  /** Delete all saved data. */
  clear() {
    this.#storage.removeItem(this.#key);
  }

  /** Turn validated plain data back into real objects. */
  #hydrate(data, serviceTypes) {
    const registry = new CustomerRegistry();
    registry.restore(data.registry);

    const queueData = data.queue;
    if (!queueData || !Array.isArray(queueData.appointments)) throw new StorageError('queue data missing');

    const appointments = queueData.appointments.map(a => {
      const customer = registry.findById(a.customerId);
      if (!customer) throw new StorageError(`appointment ${a.appointmentId} refers to an unknown customer`);
      const service = serviceTypes.find(s => s.serviceId === a.serviceId);
      if (!service) throw new StorageError(`appointment ${a.appointmentId} refers to an unknown service`);
      const appointment = Appointment.fromJSON(a, customer, service);
      customer.restoreAppointment(appointment);
      return appointment;
    });

    const queue = QueueManager.getInstance();
    queue.restore(queueData.currentQueueNumber, appointments);
    return { registry, queue };
  }

  /** Keep a copy of unreadable data under another key, then remove the original. */
  #quarantine(text) {
    try {
      this.#storage.setItem(`${this.#key}.corrupt`, text);
      this.#storage.removeItem(this.#key);
    } catch { /* nothing more we can do */ }
  }
}
