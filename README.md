# AppointEase — Online Appointment & Queue Management System

**ITDI110 – Object-Oriented Programming & Software Development**
**Checkpoint 3 – Validation, Data, Testing & Version Control**

**Group members:** Serah Morris & Andre Banvuhavuha

AppointEase lets customers register, book an appointment for a service and receive a queue number.
Staff run the live queue: call the next customer, mark customers Completed or No-show.

---

## How to Run

ES modules need a web server (opening `index.html` straight from the disk will not work).

```bash
# Python 3
python3 -m http.server 8080
# or Node
npx http-server . -p 8080
```

Open **http://localhost:8080**. (In VS Code you can also use the *Live Server* extension.)

Your data is saved automatically in the browser (`localStorage`) and is still there after a refresh.
Use **“Reset all saved demo data”** in the page footer to start again.

## How to Run the Tests

Requires Node.js 20 or newer. The unit tests need **no installation**.

```bash
npm test                # 75 unit + regression tests
npm run test:verbose    # same, listed test by test
npm run test:sanity     # the original Checkpoint 2 sanity check
npm install             # (once) installs jsdom for the browser-level tests
npm run test:ui         # 27 checks driving the real page in a simulated browser
node tests/ui-xss.mjs   # HTML-injection security check
```

---

## Project Structure (MVC)

```
appointease/
├── index.html                  View        page structure, forms, message areas
├── css/style.css               View        styling (incl. validation feedback)
├── js/app.js                   Controller  events -> validation -> Model -> JSON save -> refresh View
├── models/                     Model       data + business rules
│   ├── Person.js               base class (private id/name/email/phone, validated)
│   ├── Customer.js             extends Person   book / cancel / view appointments
│   ├── Staff.js                extends Person   call next / update status
│   ├── Appointment.js          status life-cycle (state machine), toJSON/fromJSON
│   ├── ServiceType.js          services offered
│   ├── QueueManager.js         SINGLETON - the one shared queue
│   ├── CustomerRegistry.js     registration + unique emails            (new in CP3)
│   └── errors.js               AppError > ValidationError / BusinessRuleError / StorageError (new in CP3)
├── utils/Validator.js          Regular Expressions + validation methods (new in CP3)
├── services/StorageService.js  JSON.stringify / JSON.parse persistence  (new in CP3)
├── tests/                      unit tests, regression tests, UI tests
└── docs/                       GIT_WORKFLOW.md, CONTRIBUTIONS.md, CODE_WALKTHROUGH.md
```

## OOP Features Demonstrated

| Concept | Where |
|---|---|
| Encapsulation | `#private` fields in every model class; access only through getters and controlled methods (`setStatus`, `setContact`) |
| Inheritance | `Customer` and `Staff` `extends Person` + `super()`; `ValidationError`, `BusinessRuleError`, `StorageError` extend `AppError` |
| Design pattern | **Singleton** — `QueueManager.getInstance()`: the customer screen and the staff screen must share one queue and one numbering |
| MVC | Model = `models/`, View = `index.html` + CSS, Controller = `js/app.js` |
| Regular Expressions | `PATTERNS` in `utils/Validator.js` |
| JSON | `toJSON()` on every model class; `StorageService` uses `JSON.stringify()` and `JSON.parse()` |
| Error handling | custom error classes; Controller `run()` turns errors into on-screen messages |
| Events & callbacks | form `submit`, button `click`, field `blur`/`input` listeners in `app.js` |

## Validation Rules

| Field | Rule |
|---|---|
| Name | 2–50 letters; spaces, `-` and `'` allowed inside. Blocks digits, symbols and HTML |
| Email | `local@domain.tld`, no consecutive dots, TLD of 2+ letters; stored lower-case; must be unique |
| Phone | optional `+country code`, then 7–12 digits; spaces and hyphens allowed |
| Date/time | `YYYY-MM-DDTHH:mm`, a real calendar date, in the future |
| Booking | a customer cannot book two active appointments at the same time |
| Status | only valid moves: Pending → Confirmed → Now Serving → Completed (or Cancelled / No-show); finished appointments cannot be changed or cancelled |

## Saved Data Format (JSON)

Stored in `localStorage` under the key `appointease.data`:

```json
{
  "version": 1,
  "savedAt": "2026-10-19T02:00:00.000Z",
  "registry": { "customers": [ { "id": 1, "name": "Serah Morris", "email": "serah@example.com", "phone": "0411 111 111" } ] },
  "queue": { "currentQueueNumber": 1,
             "appointments": [ { "appointmentId": 1, "customerId": 1, "serviceId": 2,
                                 "dateTime": "2099-06-15T09:00", "queueNumber": 1, "status": "Confirmed" } ] }
}
```

If saved data is damaged, the app keeps a copy under `appointease.data.corrupt`, shows a message and starts empty.

## Known Limitations / Future Work

- Data is stored per browser (no server); the customer and staff views share one browser.
- No login: customers look up their appointments by email, and one default staff member is used.
- Product backlog, user stories and sprint evidence are part of Checkpoint 4.

## Team Workflow

See `docs/GIT_WORKFLOW.md` (branches, commits, pull requests) and `docs/CONTRIBUTIONS.md` (who did what).
