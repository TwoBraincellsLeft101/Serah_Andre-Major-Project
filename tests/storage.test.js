import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { StorageService, MemoryStorage, STORAGE_KEY } from '../services/StorageService.js';
import { CustomerRegistry } from '../models/CustomerRegistry.js';
import { QueueManager } from '../models/QueueManager.js';
import { Staff } from '../models/Staff.js';
import { Appointment } from '../models/Appointment.js';
import { StorageError } from '../models/errors.js';
import { serviceTypes, service, FUTURE, FUTURE2 } from './helpers.js';

let mem, store, registry, qm;
beforeEach(() => { QueueManager.resetInstance(); qm = QueueManager.getInstance(); mem = new MemoryStorage(); store = new StorageService(mem); registry = new CustomerRegistry(); });

/** Two customers, three appointments (one Now Serving) - built the way the Controller builds them. */
function seed() {
  const a = registry.register('Serah Morris', 'serah@example.com', '0411111111');
  const b = registry.register('Andre Banvuhavuha', 'andre@example.com', '0422222222');
  [[a, FUTURE], [b, FUTURE], [a, FUTURE2]].forEach(([c, dt], i) => {
    const appt = new Appointment(i + 1, c, i === 1 ? serviceTypes[1] : service, dt, qm.generateQueueNumber());
    appt.setStatus('Confirmed'); c.bookAppointment(appt); qm.addToQueue(appt);
  });
  new Staff(100, 'Alex Rivera', 'alex@appointease.com', '0400000000', 'Front Desk').callNextCustomer();
}
const reload = () => { QueueManager.resetInstance(); return new StorageService(mem).load(serviceTypes); };

describe('StorageService', () => {
  test('load() returns null when nothing is saved', () => assert.equal(store.load(serviceTypes), null));

  test('save() writes valid JSON that contains the private data', () => {
    seed(); store.save(registry, qm);
    const parsed = JSON.parse(mem.getItem(STORAGE_KEY));
    assert.equal(parsed.version, 1);
    assert.equal(parsed.registry.customers[0].email, 'serah@example.com');
    assert.equal(parsed.queue.appointments[0].status, 'Now Serving');
    assert.equal(parsed.queue.appointments.length, 3);
  });

  test('full round trip: save -> "close the browser" -> load gives identical data', () => {
    seed(); store.save(registry, qm);
    const before = JSON.stringify({ registry, queue: qm });
    const loaded = reload();
    assert.equal(JSON.stringify({ registry: loaded.registry, queue: loaded.queue }), before);
    assert.equal(loaded.queue, QueueManager.getInstance());                 // still the Singleton
    assert.equal(loaded.queue.getNowServing().queueNumber, 1);
    const serah = loaded.registry.findByEmail('serah@example.com');
    assert.equal(serah.getAppointments().length, 2);                          // relationships restored
    assert.ok(serah.getAppointments().every(a => a.customer === serah));
  });

  test('numbering continues after a reload (no repeated queue numbers or ids)', () => {
    seed(); store.save(registry, qm);
    const { registry: r2, queue: q2 } = reload();
    assert.equal(q2.generateQueueNumber(), 4);
    assert.equal(r2.register('Third Person', 'third@example.com', '0433333333').id, 3);
  });

  test('corrupt JSON -> friendly StorageError, data quarantined, next load is clean', () => {
    mem.setItem(STORAGE_KEY, '{"version":1, "registry": {oops');
    assert.throws(() => store.load(serviceTypes), (e) => e instanceof StorageError && /started fresh/.test(e.message));
    assert.equal(mem.getItem(STORAGE_KEY), null);
    assert.ok(mem.getItem(`${STORAGE_KEY}.corrupt`).includes('oops'));
    assert.equal(store.load(serviceTypes), null);
  });

  test('wrong version, tampered values and broken references are all rejected', () => {
    seed(); store.save(registry, qm);
    const good = JSON.parse(mem.getItem(STORAGE_KEY));
    const tampers = [
      (d) => { d.version = 99; },
      (d) => { d.registry.customers[0].email = 'not-an-email'; },
      (d) => { d.registry.customers[0].name = '<img src=x onerror=alert(1)>'; },
      (d) => { d.queue.appointments[0].customerId = 999; },
      (d) => { d.queue.appointments[0].serviceId = 999; },
      (d) => { d.queue.appointments[0].status = 'Hacked'; },
      (d) => { d.queue.appointments[0].dateTime = 'garbage'; },
      (d) => { d.queue.appointments[1].queueNumber = 1; },
      (d) => { d.queue.appointments[1].status = 'Now Serving'; },
      (d) => { d.queue = null; },
      (d) => { d.registry = null; }
    ];
    for (const tamper of tampers) {
      const d = structuredClone(good); tamper(d); mem.setItem(STORAGE_KEY, JSON.stringify(d));
      QueueManager.resetInstance(); QueueManager.getInstance();
      assert.throws(() => new StorageService(mem).load(serviceTypes), StorageError);
    }
  });

  test('save() gives a friendly StorageError when the browser refuses (storage full)', () => {
    const full = { getItem: () => null, removeItem() {}, setItem() { throw new Error('QuotaExceededError'); } };
    assert.throws(() => new StorageService(full).save(registry, qm), (e) => e instanceof StorageError && /could not be saved/.test(e.message));
  });

  test('clear() removes the saved data', () => { seed(); store.save(registry, qm); store.clear(); assert.equal(store.load(serviceTypes), null); });
});
