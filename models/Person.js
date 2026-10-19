/**
 * Person.js - Base class for all people in the system (Customer, Staff)
 * Demonstrates: Encapsulation (private fields), Constructor, Getters/Setters
 * Checkpoint 3: input is now validated, and toJSON() allows JSON storage.
 */
import { Validator } from '../utils/Validator.js';
import { ValidationError } from './errors.js';

export class Person {
  #id;
  #name;
  #email;
  #phone;

  /**
   * @param {number} id     - positive whole number
   * @param {string} name   - validated by Validator.name
   * @param {string} email  - validated by Validator.email
   * @param {string} phone  - validated by Validator.phone
   * @throws {ValidationError} if any value is invalid
   */
  constructor(id, name, email, phone) {
    if (!Number.isInteger(id) || id < 1) throw new ValidationError('A person needs a positive whole-number id.', 'id');
    this.#id = id;
    this.#name = Validator.name(name);
    this.#email = Validator.email(email);
    this.#phone = Validator.phone(phone);
  }

  get id() {
    return this.#id;
  }

  getName() {
    return this.#name;
  }

  getContact() {
    return {
      email: this.#email,
      phone: this.#phone
    };
  }

  /**
   * Update contact details. Only the values supplied are changed; each is
   * validated BEFORE anything is stored, so a failed update changes nothing.
   * @param {string} [email]
   * @param {string} [phone]
   * @throws {ValidationError}
   */
  setContact(email, phone) {
    const newEmail = email ? Validator.email(email) : this.#email;
    const newPhone = phone ? Validator.phone(phone) : this.#phone;
    this.#email = newEmail;
    this.#phone = newPhone;
  }

  // For display purposes
  toString() {
    return `${this.#name} (${this.#email})`;
  }

  /**
   * Called automatically by JSON.stringify(). Private (#) fields are invisible
   * to JSON.stringify, so without this method the result would be "{}".
   * @returns {{id:number, name:string, email:string, phone:string}}
   */
  toJSON() {
    return { id: this.#id, name: this.#name, email: this.#email, phone: this.#phone };
  }
}
