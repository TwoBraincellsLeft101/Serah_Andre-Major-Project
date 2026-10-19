/**
 * errors.js - Custom error classes (Checkpoint 3)
 *
 * Every error the application EXPECTS (bad input, a broken business rule,
 * a storage problem) extends AppError. The Controller catches AppError and
 * shows its message to the user. Any other error is treated as a bug: it is
 * logged to the console and the user sees a generic message.
 * Demonstrates: Inheritance (extends + super()).
 */

/** Base class for all expected application errors. */
export class AppError extends Error {
  /** @param {string} message - user-friendly text that can be shown on screen */
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** Raised when user input fails validation (e.g. bad email format). */
export class ValidationError extends AppError {
  /**
   * @param {string} message - what is wrong and how to fix it
   * @param {string} [field] - the field concerned ('email', 'phone', ...)
   */
  constructor(message, field = '') {
    super(message);
    this.field = field;
  }
}

/** Raised when the input is valid but an action breaks a business rule
 *  (e.g. cancelling a completed appointment, double-booking). */
export class BusinessRuleError extends AppError {}

/** Raised when saving to or loading from storage fails. */
export class StorageError extends AppError {}
