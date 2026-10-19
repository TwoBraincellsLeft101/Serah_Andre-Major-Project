/**
 * ServiceType.js
 * Checkpoint 3: constructor validates its input; toJSON() added.
 */
import { ValidationError } from './errors.js';

export class ServiceType {
  #serviceId;
  #serviceName;
  #estimatedDuration; // in minutes

  /**
   * @param {number} serviceId          - positive whole number
   * @param {string} serviceName        - not empty
   * @param {number} estimatedDuration  - positive whole number of minutes
   * @throws {ValidationError}
   */
  constructor(serviceId, serviceName, estimatedDuration) {
    if (!Number.isInteger(serviceId) || serviceId < 1) throw new ValidationError('A service needs a positive whole-number id.', 'service');
    if (typeof serviceName !== 'string' || !serviceName.trim()) throw new ValidationError('A service needs a name.', 'service');
    if (!Number.isInteger(estimatedDuration) || estimatedDuration < 1) {
      throw new ValidationError('Estimated duration must be a positive whole number of minutes.', 'service');
    }
    this.#serviceId = serviceId;
    this.#serviceName = serviceName.trim();
    this.#estimatedDuration = estimatedDuration;
  }

  get serviceId() {
    return this.#serviceId;
  }

  get serviceName() {
    return this.#serviceName;
  }

  get estimatedDuration() {
    return this.#estimatedDuration;
  }

  getDetails() {
    return {
      id: this.#serviceId,
      name: this.#serviceName,
      duration: this.#estimatedDuration
    };
  }

  toString() {
    return `${this.#serviceName} (~${this.#estimatedDuration} min)`;
  }

  /** @returns {{serviceId:number, serviceName:string, estimatedDuration:number}} */
  toJSON() {
    return { serviceId: this.#serviceId, serviceName: this.#serviceName, estimatedDuration: this.#estimatedDuration };
  }
}
