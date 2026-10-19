/**
 * CustomerRegistry.js (new in Checkpoint 3)
 * Keeps every registered customer, enforces unique emails and issues ids.
 * In Checkpoint 2 this lived in the Controller (a Map and a counter); it is now
 * part of the Model so the business rule is enforced (and tested) in one place.
 */
import { Customer } from './Customer.js';
import { Validator } from '../utils/Validator.js';
import { BusinessRuleError, ValidationError } from './errors.js';

export class CustomerRegistry {
  #customers = new Map(); // email -> Customer

  /**
   * Register a new customer.
   * @returns {Customer}
   * @throws {ValidationError}   invalid name, email or phone
   * @throws {BusinessRuleError} email already registered
   */
  register(name, email, phone) {
    const cleanEmail = Validator.email(email);
    if (this.#customers.has(cleanEmail)) {
      throw new BusinessRuleError('An account with this email already exists.');
    }
    const customer = new Customer(this.#nextId(), name, cleanEmail, phone); // validates name and phone
    this.#customers.set(cleanEmail, customer);
    return customer;
  }

  /** @returns {Customer|undefined} (the email is cleaned the same way as when registering) */
  findByEmail(email) {
    return this.#customers.get(String(email ?? '').trim().toLowerCase());
  }

  /** @returns {Customer|undefined} */
  findById(id) {
    return this.getAll().find(c => c.id === id);
  }

  /** @returns {Customer[]} all customers in registration order */
  getAll() {
    return [...this.#customers.values()];
  }

  /** Next id = highest existing id + 1 (so ids are never reused). */
  #nextId() {
    return Math.max(0, ...this.getAll().map(c => c.id)) + 1;
  }

  /** @returns {{customers:object[]}} used by JSON.stringify() */
  toJSON() {
    return { customers: this.getAll().map(c => c.toJSON()) };
  }

  /**
   * Rebuild customers from parsed JSON.
   * @throws {ValidationError} if the saved data is malformed or has duplicate emails/ids
   */
  restore(data) {
    if (!data || !Array.isArray(data.customers)) throw new ValidationError('Saved customer data is malformed.');
    const restored = new Map();
    for (const c of data.customers) {
      const customer = new Customer(c.id, c.name, c.email, c.phone);
      const email = customer.getContact().email;
      if (restored.has(email)) throw new ValidationError('Saved data contains a duplicate email.');
      restored.set(email, customer);
    }
    const ids = [...restored.values()].map(c => c.id);
    if (new Set(ids).size !== ids.length) throw new ValidationError('Saved data contains duplicate customer ids.');
    this.#customers = restored;
  }
}
