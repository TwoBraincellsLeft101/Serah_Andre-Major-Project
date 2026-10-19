// UI security test (BUG-12): a customer name containing HTML must NOT become real page elements.
// Uses only element ids that exist in both the Checkpoint 2 and Checkpoint 3 pages.
// Run: node tests/ui-xss.mjs            (checks the project this file is in)
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace(/<script[^>]*><\/script>/, '');
const w = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true }).window;
Object.assign(globalThis, { document: w.document, localStorage: w.localStorage, confirm: () => true });
await import('../js/app.js');
document.dispatchEvent(new w.Event('DOMContentLoaded'));
const $ = (id) => document.getElementById(id);
const set = (id, v) => { $(id).value = v; };
const submit = (id) => $(id).dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));

set('reg-name', '<img src=x onerror=alert(1)>'); set('reg-email', 'xss@example.com'); set('reg-phone', '0411111111');
submit('register-form');
set('book-email', 'xss@example.com'); set('book-service', '1'); set('book-datetime', '2099-06-15T09:00');
submit('book-form');
const injected = document.querySelectorAll('#queue-list img, #staff-queue-list img, #my-appointments img, #now-serving img').length;
console.log(injected === 0 ? 'PASS - HTML in a name was NOT turned into page elements' : `FAIL - ${injected} injected <img> element(s) appeared in the page (stored XSS)`);
process.exit(injected === 0 ? 0 : 1);
