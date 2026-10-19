/**
 * Validator.js - all input validation, built on Regular Expressions (Checkpoint 3)
 *
 * Each method receives raw user input, validates it and returns the CLEANED
 * value (trimmed / normalised). If the input is wrong it throws a
 * ValidationError whose message is written for end users.
 *
 * Validation runs in two places:
 *   1. The Controller (live feedback in the form), and
 *   2. The Model constructors/methods (so bad data can never enter the system,
 *      even if someone bypasses the form).
 */
import { ValidationError } from '../models/errors.js';

/** Regular expressions used by the system (exported so they can be unit-tested). */
export const PATTERNS = Object.freeze({
  /** 2-50 letters; spaces, apostrophes and hyphens allowed inside (Mary-Jane, O'Neil). */
  NAME: /^\p{L}[\p{L} '\-]{0,48}\p{L}$/u,
  /** local@domain.tld - no consecutive dots, TLD of at least 2 letters. */
  EMAIL: /^(?!.*\.\.)[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/,
  /** Checked AFTER spaces and hyphens are removed: optional +country code, then 7-12 digits. */
  PHONE: /^(?:\+\d{1,3})?\d{7,12}$/,
  /** The value produced by <input type="datetime-local">: YYYY-MM-DDTHH:mm */
  DATE_TIME: /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
});

export class Validator {
  /**
   * Validate a person's name.
   * @param {string} value
   * @returns {string} trimmed name with repeated spaces collapsed
   * @throws {ValidationError}
   */
  static name(value) {
    const cleaned = String(value ?? '').trim().replace(/\s+/g, ' ');
    if (!cleaned) throw new ValidationError('Please enter your name.', 'name');
    if (!PATTERNS.NAME.test(cleaned)) {
      throw new ValidationError('Name must be 2-50 letters (spaces, hyphens and apostrophes are allowed).', 'name');
    }
    return cleaned;
  }

  /**
   * Validate an email address.
   * @param {string} value
   * @returns {string} trimmed, lower-case email
   * @throws {ValidationError}
   */
  static email(value) {
    const cleaned = String(value ?? '').trim().toLowerCase();
    if (!cleaned) throw new ValidationError('Please enter your email address.', 'email');
    if (!PATTERNS.EMAIL.test(cleaned)) {
      throw new ValidationError('Enter a valid email address, e.g. name@example.com.', 'email');
    }
    return cleaned;
  }

  /**
   * Validate a phone number. Spaces and hyphens are allowed for readability.
   * @param {string} value
   * @returns {string} the trimmed phone number as typed
   * @throws {ValidationError}
   */
  static phone(value) {
    const cleaned = String(value ?? '').trim();
    if (!cleaned) throw new ValidationError('Please enter your phone number.', 'phone');
    if (!PATTERNS.PHONE.test(cleaned.replace(/[\s-]/g, ''))) {
      throw new ValidationError('Enter a valid phone number (7-12 digits, optional +country code), e.g. 0412 345 678.', 'phone');
    }
    return cleaned;
  }

  /**
   * Check that a date/time string is correctly formatted and a REAL date.
   * (Does not require it to be in the future - used when loading saved data.)
   * @param {string} value - 'YYYY-MM-DDTHH:mm'
   * @returns {Date} the date/time in local time
   * @throws {ValidationError}
   */
  static dateTimeFormat(value) {
    const text = String(value ?? '').trim();
    if (!text) throw new ValidationError('Please choose a date and time.', 'dateTime');
    const match = PATTERNS.DATE_TIME.exec(text);
    if (!match) throw new ValidationError('Date and time are not in a valid format.', 'dateTime');
    const [year, month, day, hour, minute] = match.slice(1).map(Number);
    const date = new Date(year, month - 1, day, hour, minute);
    // JavaScript silently rolls 31 Feb over to March, so compare the parts back.
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day ||
        date.getHours() !== hour || date.getMinutes() !== minute) {
      throw new ValidationError('That date does not exist. Please check the day and month.', 'dateTime');
    }
    return date;
  }

  /**
   * Validate the date/time for a NEW booking: valid format, real date, in the future.
   * @param {string} value - 'YYYY-MM-DDTHH:mm'
   * @param {Date} [now=new Date()] - injectable "current time" (makes tests repeatable)
   * @returns {Date}
   * @throws {ValidationError}
   */
  static dateTime(value, now = new Date()) {
    const date = Validator.dateTimeFormat(value);
    if (date.getTime() <= now.getTime()) {
      throw new ValidationError('Appointments must be booked for a future date and time.', 'dateTime');
    }
    return date;
  }
}
