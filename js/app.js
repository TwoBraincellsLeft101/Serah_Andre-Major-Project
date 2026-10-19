/**
 * app.js - Controller (MVC)
 * Wires the View (DOM) to the Model (classes).
 *
 * Checkpoint 3 changes:
 *  - Validation through utils/Validator.js (regular expressions) with inline messages
 *  - Customer rules moved to CustomerRegistry (Model); data saved/loaded as JSON
 *  - Every action runs inside run(): errors become friendly on-screen messages
 *  - All text put into the page is escaped (escapeHtml) to prevent HTML injection
 */
import { Customer } from '../models/Customer.js';          // eslint-disable-line no-unused-vars
import { Staff } from '../models/Staff.js';
import { ServiceType } from '../models/ServiceType.js';
import { Appointment } from '../models/Appointment.js';
import { QueueManager } from '../models/QueueManager.js';
import { CustomerRegistry } from '../models/CustomerRegistry.js';
import { AppError, ValidationError, BusinessRuleError } from '../models/errors.js';
import { Validator } from '../utils/Validator.js';
import { StorageService } from '../services/StorageService.js';

// -------------------- Model layer (in-memory store) --------------------
let registry = new CustomerRegistry(); // all customers (unique emails, ids)
const storage = new StorageService();  // JSON persistence

// Pre-defined service types
const serviceTypes = [
  new ServiceType(1, 'General Consultation', 15),
  new ServiceType(2, 'Specialist Appointment', 30),
  new ServiceType(3, 'Document Collection', 10),
  new ServiceType(4, 'Account Inquiry', 20)
];

// Default staff member
const defaultStaff = new Staff(100, 'Alex Rivera', 'alex@appointease.com', '0400000000', 'Front Desk');

// -------------------- Validation (R8) --------------------
// Which Validator method checks which input. Used for live (on blur) feedback.
const fieldRules = {
  'reg-name': Validator.name,
  'reg-email': Validator.email,
  'reg-phone': Validator.phone,
  'book-email': Validator.email,
  'book-datetime': (v) => Validator.dateTime(v),
  'book-service': (v) => {
    if (!serviceTypes.some(s => String(s.serviceId) === v)) throw new ValidationError('Please choose a service.', 'service');
  },
  'lookup-email': Validator.email
};

/**
 * Validate one input and show/hide the message under it.
 * @param {string} inputId
 * @returns {boolean} true if valid
 */
function validateField(inputId) {
  const input = document.getElementById(inputId);
  const errorBox = document.getElementById(`${inputId}-error`);
  try {
    fieldRules[inputId](input.value);
    input.classList.remove('invalid');
    input.classList.toggle('valid', input.value !== '' && input.tagName === 'INPUT');
    if (errorBox) errorBox.textContent = '';
    return true;
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
    input.classList.add('invalid');
    input.classList.remove('valid');
    if (errorBox) errorBox.textContent = error.message;
    return false;
  }
}

/** Validate every field of a form (so ALL errors show at once); focus the first bad one. */
function validateFields(inputIds) {
  const results = inputIds.map(validateField);
  const firstBad = inputIds.find((id, i) => !results[i]);
  if (firstBad) document.getElementById(firstBad).focus();
  return results.every(Boolean);
}

// -------------------- View helpers --------------------
function showMessage(elementId, message, type = 'info') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.className = `message ${type}`;
  el.style.display = 'block';
  setTimeout(() => {
    el.style.display = 'none';
  }, 4000);
}

function clearForm(formId) {
  document.getElementById(formId).reset();
  document.querySelectorAll(`#${formId} input, #${formId} select`).forEach(i => i.classList.remove('valid', 'invalid'));
  document.querySelectorAll(`#${formId} .field-error`).forEach(e => { e.textContent = ''; });
}

/** Turn text into safe HTML (stops "<img onerror=...>" in a name from running as code). */
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

// -------------------- Error handling & saving --------------------
/**
 * Run a controller action. Expected errors (AppError) show their friendly message in
 * the given message box; unexpected errors are logged and a generic message is shown.
 */
function run(action, messageId) {
  try {
    action();
  } catch (error) {
    if (error instanceof AppError) {
      showMessage(messageId, error.message, 'error');
    } else {
      console.error('Unexpected error:', error); // for developers
      showMessage(messageId, 'Something went wrong. Please try again.', 'error');
    }
  }
}

/** Save everything as JSON. A failed save is reported but never blocks the action. */
function persist(messageId) {
  try {
    storage.save(registry, QueueManager.getInstance());
  } catch (error) {
    showMessage(messageId, error.message, 'error');
  }
}

function nextAppointmentId() {
  return Math.max(0, ...QueueManager.getInstance().getQueueList().map(a => a.appointmentId)) + 1;
}

// -------------------- Controller actions --------------------

// R1 – Register new customer
function handleRegister(event) {
  event.preventDefault();
  if (!validateFields(['reg-name', 'reg-email', 'reg-phone'])) {
    showMessage('reg-message', 'Please fix the highlighted fields.', 'error');
    return;
  }
  run(() => {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;

    const customer = registry.register(name, email, phone); // Model validates and checks uniqueness
    persist('reg-message');
    showMessage('reg-message', `Welcome ${customer.getName()}! Registration successful.`, 'success');
    clearForm('register-form');

    // Auto-fill booking form email
    document.getElementById('book-email').value = customer.getContact().email;
  }, 'reg-message');
}

// R2 + R3 – Book appointment (generates queue number)
function handleBook(event) {
  event.preventDefault();
  if (!validateFields(['book-email', 'book-service', 'book-datetime'])) {
    showMessage('book-message', 'Please fix the highlighted fields.', 'error');
    return;
  }
  run(() => {
    const email = document.getElementById('book-email').value.trim().toLowerCase();
    const serviceId = parseInt(document.getElementById('book-service').value, 10);
    const dateTime = document.getElementById('book-datetime').value;

    const customer = registry.findByEmail(email);
    if (!customer) throw new BusinessRuleError('Customer not found. Please register first.');
    const service = serviceTypes.find(s => s.serviceId === serviceId);

    // Check the rules BEFORE a queue number is issued, so a refused booking leaves no gap.
    Validator.dateTime(dateTime);
    customer.assertSlotFree(dateTime);

    const qm = QueueManager.getInstance();
    const queueNumber = qm.generateQueueNumber();
    const appointment = new Appointment(nextAppointmentId(), customer, service, dateTime, queueNumber);

    // Confirm automatically for demo simplicity
    appointment.setStatus('Confirmed');

    customer.bookAppointment(appointment);
    qm.addToQueue(appointment);

    persist('book-message');
    showMessage('book-message', `Appointment booked! Your queue number is #${queueNumber}.`, 'success');
    clearForm('book-form');
    document.getElementById('book-email').value = email; // keep email

    refreshQueueDisplay();
    refreshMyAppointments(email);
  }, 'book-message');
}

// R5 – Cancel appointment
function handleCancel(appointmentId, email) {
  run(() => {
    const customer = registry.findByEmail(email);
    if (!customer) throw new BusinessRuleError('Customer not found.');

    if (!customer.cancelAppointment(appointmentId)) throw new BusinessRuleError('Could not find that appointment.');
    persist('my-appts-message');
    showMessage('my-appts-message', 'Appointment cancelled successfully.', 'success');
    refreshQueueDisplay();
    refreshMyAppointments(email);
  }, 'my-appts-message');
}

// R6 – Staff: Call next customer
function handleCallNext() {
  run(() => {
    const next = defaultStaff.callNextCustomer();
    persist('staff-message');

    if (next) {
      showMessage(
        'staff-message',
        `Now serving: Queue #${next.queueNumber} – ${next.customer.getName()}`,
        'success'
      );
    } else {
      showMessage('staff-message', 'No more customers waiting in the queue.', 'info');
    }
    refreshQueueDisplay();
  }, 'staff-message');
}

// R6 – Staff: Mark as Completed / No-show
function handleUpdateStatus(appointmentId, newStatus) {
  run(() => {
    const qm = QueueManager.getInstance();
    const appt = qm.getQueueList().find(a => a.appointmentId === appointmentId);
    if (!appt) throw new BusinessRuleError('Could not find that appointment.');

    defaultStaff.updateAppointmentStatus(appt, newStatus);
    persist('staff-message');
    showMessage('staff-message', `Appointment #${appt.queueNumber} marked as ${newStatus}.`, 'success');
    refreshQueueDisplay();
  }, 'staff-message');
}

// Clear every customer and appointment (demo reset)
function handleReset() {
  if (!confirm('Delete ALL customers and appointments? This cannot be undone.')) return;
  run(() => {
    storage.clear();
    QueueManager.getInstance().restore(0, []); // same Singleton, emptied
    registry = new CustomerRegistry();
    refreshQueueDisplay();
    refreshMyAppointments('');
    showMessage('app-message', 'All saved data was cleared.', 'info');
  }, 'app-message');
}

// -------------------- View update functions --------------------

function populateServiceSelect() {
  const select = document.getElementById('book-service');
  select.innerHTML = '<option value="">-- Select a service --</option>';
  serviceTypes.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.serviceId;
    opt.textContent = s.toString();
    select.appendChild(opt);
  });
}

function refreshQueueDisplay() {
  const qm = QueueManager.getInstance();
  const list = qm.getQueueList();
  const nowServing = qm.getNowServing();

  // Now Serving banner
  const nowEl = document.getElementById('now-serving');
  if (nowServing && nowServing.getStatus() === 'Now Serving') {
    nowEl.innerHTML = `
      <strong>NOW SERVING</strong><br>
      Queue #${nowServing.queueNumber} – ${escapeHtml(nowServing.customer.getName())}<br>
      <small>${escapeHtml(nowServing.serviceType.serviceName)}</small>
    `;
    nowEl.className = 'now-serving active';
  } else {
    nowEl.innerHTML = '<strong>NOW SERVING</strong><br><em>None</em>';
    nowEl.className = 'now-serving';
  }

  // Waiting list
  const waitingEl = document.getElementById('queue-list');
  const waiting = list.filter(a => a.isWaiting());

  if (waiting.length === 0) {
    waitingEl.innerHTML = '<li class="empty">No customers currently waiting.</li>';
  } else {
    waitingEl.innerHTML = waiting
      .map(a => `
        <li>
          <span class="qnum">#${a.queueNumber}</span>
          <span class="name">${escapeHtml(a.customer.getName())}</span>
          <span class="service">${escapeHtml(a.serviceType.serviceName)}</span>
          <span class="status badge">${escapeHtml(a.getStatus())}</span>
        </li>
      `)
      .join('');
  }

  // Full queue for staff panel (including Now Serving / Completed recently)
  const staffListEl = document.getElementById('staff-queue-list');
  if (list.length === 0) {
    staffListEl.innerHTML = '<li class="empty">Queue is empty.</li>';
  } else {
    staffListEl.innerHTML = list
      .map(a => {
        const canComplete = a.getStatus() === 'Now Serving';
        return `
          <li class="staff-item status-${a.getStatus().toLowerCase().replace(' ', '-')}">
            <div>
              <strong>#${a.queueNumber}</strong> – ${escapeHtml(a.customer.getName())}
              <br><small>${escapeHtml(a.serviceType.serviceName)} · ${escapeHtml(a.getStatus())}</small>
            </div>
            <div class="actions">
              ${canComplete ? `
                <button class="btn-sm success" data-id="${a.appointmentId}" data-status="Completed">Complete</button>
                <button class="btn-sm danger" data-id="${a.appointmentId}" data-status="No-show">No-show</button>
              ` : ''}
            </div>
          </li>
        `;
      })
      .join('');

    // Attach event listeners for status buttons
    staffListEl.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        handleUpdateStatus(parseInt(btn.dataset.id, 10), btn.dataset.status);
      });
    });
  }

  // Stats
  document.getElementById('waiting-count').textContent = qm.getWaitingCount();
  document.getElementById('total-served').textContent =
    list.filter(a => a.getStatus() === 'Completed').length;
}

function refreshMyAppointments(email) {
  const container = document.getElementById('my-appointments');
  const customer = registry.findByEmail(email);
  if (!customer) {
    container.innerHTML = '<p class="empty">Register or enter your email above to see appointments.</p>';
    return;
  }

  const appts = customer.getAppointments();
  if (appts.length === 0) {
    container.innerHTML = '<p class="empty">You have no appointments yet.</p>';
    return;
  }

  container.innerHTML = appts
    .map(a => {
      const canCancel = a.isWaiting();
      return `
        <div class="appt-card">
          <div class="appt-header">
            <span class="qnum">Queue #${a.queueNumber}</span>
            <span class="badge status-${a.getStatus().toLowerCase().replace(' ', '-')}">${escapeHtml(a.getStatus())}</span>
          </div>
          <p><strong>Service:</strong> ${escapeHtml(a.serviceType.serviceName)}</p>
          <p><strong>When:</strong> ${escapeHtml(new Date(a.dateTime).toLocaleString())}</p>
          ${canCancel ? `
            <button class="btn-sm danger cancel-btn" data-id="${a.appointmentId}" data-email="${escapeHtml(email)}">
              Cancel Appointment
            </button>
          ` : ''}
        </div>
      `;
    })
    .join('');

  container.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      handleCancel(parseInt(btn.dataset.id, 10), btn.dataset.email);
    });
  });
}

// Lookup my appointments by email
function handleLookup() {
  if (!validateField('lookup-email')) {
    showMessage('my-appts-message', 'Please enter a valid email.', 'error');
    return;
  }
  run(() => {
    const email = document.getElementById('lookup-email').value.trim().toLowerCase();
    if (!registry.findByEmail(email)) throw new BusinessRuleError('No customer found with that email.');
    refreshMyAppointments(email);
  }, 'my-appts-message');
}

// -------------------- Initialise --------------------
/** Load saved JSON data (if any). Corrupt data is reported and the app starts empty. */
function loadSavedData() {
  try {
    const loaded = storage.load(serviceTypes);
    if (loaded) registry = loaded.registry;
  } catch (error) {
    showMessage('app-message', error.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSavedData();

  // Forms
  document.getElementById('register-form').addEventListener('submit', handleRegister);
  document.getElementById('book-form').addEventListener('submit', handleBook);
  document.getElementById('call-next-btn').addEventListener('click', handleCallNext);
  document.getElementById('lookup-btn').addEventListener('click', handleLookup);
  document.getElementById('reset-data').addEventListener('click', handleReset);

  // Live validation: check a field when the user leaves it, and again while they fix it.
  Object.keys(fieldRules).forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener('blur', () => validateField(id));
    input.addEventListener('input', () => {
      if (input.classList.contains('invalid')) validateField(id);
    });
  });

  populateServiceSelect();
  refreshQueueDisplay();

  // Set min datetime to now
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('book-datetime').min = now.toISOString().slice(0, 16);

  console.log('AppointEase Checkpoint 3 loaded.');
});
