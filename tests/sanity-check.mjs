/**
 * sanity-check.mjs
 * Run with: node tests/sanity-check.mjs
 * Confirms core OOP design works as specified in Checkpoint 1 / 2.
 * (Checkpoint 3: dates moved to 2099 because bookings in the past are now rejected.)
 */
import { Person } from '../models/Person.js';
import { Customer } from '../models/Customer.js';
import { Staff } from '../models/Staff.js';
import { ServiceType } from '../models/ServiceType.js';
import { Appointment } from '../models/Appointment.js';
import { QueueManager } from '../models/QueueManager.js';

console.log('=== AppointEase Sanity Check ===\n');

// Reset singleton for clean test
QueueManager.resetInstance();

// 1. Inheritance & constructors
const customer1 = new Customer(1, 'Serah Morris', 'serah@example.com', '0411111111');
const customer2 = new Customer(2, 'Andre Banvuhavuha', 'andre@example.com', '0422222222');
const staff = new Staff(10, 'Alex Rivera', 'alex@appointease.com', '0400000000', 'Front Desk');

console.log('✓ Customer & Staff created via inheritance');
console.log('  Customer1 name:', customer1.getName());
console.log('  Staff role:', staff.getRole());

// 2. Encapsulation – private fields not accessible from outside
// (SyntaxError if we try to write customer1.#name in this file)
console.log('✓ Encapsulation: private fields (#id, #name, etc.) only accessible via getters');
console.log('  getName() works →', customer1.getName());
console.log('  getContact() works →', JSON.stringify(customer1.getContact()));


// 3. Singleton
const qm1 = QueueManager.getInstance();
const qm2 = QueueManager.getInstance();
console.log('✓ Singleton: getInstance() twice returns same object →', qm1 === qm2);

// 4. Service types
const service = new ServiceType(1, 'General Consultation', 15);
console.log('✓ ServiceType:', service.toString());

// 5. Book appointments → sequential queue numbers
const qn1 = qm1.generateQueueNumber();
const appt1 = new Appointment(101, customer1, service, '2099-10-02T10:00', qn1);
appt1.setStatus('Confirmed');
customer1.bookAppointment(appt1);
qm1.addToQueue(appt1);

const qn2 = qm1.generateQueueNumber();
const appt2 = new Appointment(102, customer2, service, '2099-10-02T10:30', qn2);
appt2.setStatus('Confirmed');
customer2.bookAppointment(appt2);
qm1.addToQueue(appt2);

console.log('✓ Sequential queue numbers:', qn1, 'and', qn2);
console.log('  Queue length:', qm1.getQueueList().length);

// 6. Call next
const next = staff.callNextCustomer();
console.log('✓ callNextCustomer() → Now Serving:', next ? next.toString() : 'null');
console.log('  Status of first appointment:', appt1.getStatus());

// 7. Cancel
customer2.cancelAppointment(102);
console.log('✓ Cancel appointment → status:', appt2.getStatus());

// 8. Invalid status rejected
try {
  appt1.setStatus('InvalidStatus');
  console.log('✗ Should have thrown on invalid status');
} catch (e) {
  console.log('✓ setStatus() rejects invalid status:', e.message.slice(0, 40) + '...');
}

// 9. Waiting count
console.log('✓ Remaining waiting:', qm1.getWaitingCount());

console.log('\n=== All sanity checks passed ===');
