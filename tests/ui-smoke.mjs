// UI smoke test: drives the real index.html + app.js (Controller) in a simulated browser (jsdom).
// Run: npm install && npm run test:ui
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import { QueueManager } from '../models/QueueManager.js';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace(/<script[^>]*><\/script>/, '');
let boots = 0, failures = 0;
const check = (name, ok) => { console.log(ok ? 'PASS' : 'FAIL', '-', name); if (!ok) failures++; };

/** Start the app in a fresh simulated browser, optionally with data already in localStorage. */
async function boot(savedText) {
  QueueManager.resetInstance();
  const w = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true }).window;
  if (savedText !== undefined) w.localStorage.setItem('appointease.data', savedText);
  Object.assign(globalThis, { document: w.document, localStorage: w.localStorage, confirm: () => true });
  const errors = []; console.error = (...a) => errors.push(a);
  await import(`../js/app.js?boot=${++boots}`);
  document.dispatchEvent(new w.Event('DOMContentLoaded'));
  const $ = (id) => w.document.getElementById(id);
  return {
    w, $, errors,
    set: (id, v) => { $(id).value = v; $(id).dispatchEvent(new w.Event('input', { bubbles: true })); },
    submit: (id) => $(id).dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })),
    click: (id) => $(id).dispatchEvent(new w.Event('click', { bubbles: true })),
    text: (id) => $(id).textContent.replace(/\s+/g, ' ').trim()
  };
}
const register = (a, name, email, phone) => { a.set('reg-name', name); a.set('reg-email', email); a.set('reg-phone', phone); a.submit('register-form'); };
const book = (a, email, dt) => { a.set('book-email', email); a.set('book-service', '2'); a.set('book-datetime', dt); a.submit('book-form'); };

// ---- 1. Registration validation ----
let a = await boot();
register(a, 'S', 'bad', 'abc');
check('invalid registration shows an inline error under each of the 3 fields', ['reg-name', 'reg-email', 'reg-phone'].every(id => a.text(`${id}-error`)));
check('invalid fields are highlighted', a.$('reg-email').classList.contains('invalid'));
check('nothing was saved', a.w.localStorage.getItem('appointease.data') === null);
register(a, 'Serah Morris', 'serah@example.com', '0411 111 111');
check('valid registration succeeds', /Registration successful/.test(a.text('reg-message')));
check('booking form email is auto-filled', a.$('book-email').value === 'serah@example.com');
register(a, 'Other Person', 'SERAH@example.com', '0422222222');
check('duplicate email gets a friendly message', /already exists/.test(a.text('reg-message')));
register(a, 'Andre Banvuhavuha', 'andre@example.com', '5551234');
check('7-digit local phone number is accepted', /Registration successful/.test(a.text('reg-message')));

// ---- 2. Booking rules ----
book(a, 'serah@example.com', '2020-01-06T09:00');
check('booking in the past shows an inline error', /future/.test(a.text('book-datetime-error')));
book(a, 'nobody@example.com', '2099-06-15T09:00');
check('booking for an unregistered email gives a friendly message', /register first/.test(a.text('book-message')));
book(a, 'serah@example.com', '2099-06-15T09:00');
check('valid booking gets queue number #1', /queue number is #1/.test(a.text('book-message')));
book(a, 'serah@example.com', '2099-06-15T09:00');
check('double-booking is refused with a friendly message', /already have an appointment/.test(a.text('book-message')));
book(a, 'andre@example.com', '2099-06-15T09:00');
check('a refused booking does not burn a queue number (next booking is #2)', /queue number is #2/.test(a.text('book-message')));

// ---- 3. JSON persistence ----
const saved = JSON.parse(a.w.localStorage.getItem('appointease.data'));
check('state is saved as JSON (2 customers, 2 appointments)', saved.registry.customers.length === 2 && saved.queue.appointments.length === 2);
const savedText = a.w.localStorage.getItem('appointease.data');

// ---- 4. Staff actions ----
check('staff list shows both waiting customers', a.text('waiting-count') === '2');
a.click('call-next-btn');
check('call next -> Now Serving #1', /Queue #1/.test(a.text('now-serving')));
[...a.w.document.querySelectorAll('#staff-queue-list button')].find(b => b.dataset.status === 'Completed').click();
check('Complete -> served count 1', a.text('total-served') === '1');
a.click('call-next-btn'); a.click('call-next-btn');
check('call next with nobody waiting -> friendly message', /No more customers/.test(a.text('staff-message')));
check('no unexpected exceptions were logged', a.errors.length === 0);

// ---- 5. Customer cancelling ----
a.set('lookup-email', 'bad'); a.w.document.getElementById('lookup-btn').click();
check('lookup with an invalid email shows an inline error', /valid email/.test(a.text('lookup-email-error')));

// ---- 6. Reload restores the data ----
a = await boot(savedText);
check('after a reload the waiting list is restored', a.text('waiting-count') === '2');
a.set('lookup-email', 'serah@example.com'); a.click('lookup-btn');
check("after a reload a customer's appointment is still listed", /Specialist Appointment/.test(a.text('my-appointments')));
book(a, 'serah@example.com', '2099-06-16T10:00');
check('queue numbering continues after a reload (#3)', /queue number is #3/.test(a.text('book-message')));
a.click('lookup-btn');
a.w.document.querySelector('.cancel-btn').click();
check('customer can cancel a waiting appointment', /cancelled successfully/.test(a.text('my-appts-message')));
check('cancelled appointment leaves the waiting list', a.text('waiting-count') === '2');

// ---- 7. Corrupt saved data ----
a = await boot('{"version":1, "registry": {oops');
check('corrupt saved data -> clear message, app still works', /could not be read/.test(a.text('app-message')) && a.text('waiting-count') === '0');
check('corrupt data was kept as a backup', a.w.localStorage.getItem('appointease.data.corrupt') !== null);

// ---- 8. Reset ----
a = await boot(savedText);
a.click('reset-data');
check('reset clears the queue and the saved data', a.text('waiting-count') === '0' && a.w.localStorage.getItem('appointease.data') === null);

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll UI checks passed');
process.exit(failures ? 1 : 0);
