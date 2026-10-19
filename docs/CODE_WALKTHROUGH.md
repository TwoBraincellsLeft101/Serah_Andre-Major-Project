# Code Walkthrough — be ready to explain this

The brief says you must be able to explain and defend every part of the submitted code. Use this as a
checklist: open each file, read it, run its test, and be able to answer the questions.

## The flow of one booking (follow it in `js/app.js` → `handleBook`)
1. User clicks *Book* → the `submit` event calls `handleBook` (**events & callbacks**).
2. `validateFields()` checks each field with `Validator` (**regular expressions**) and shows inline errors.
3. `run(() => …)` wraps the rest in `try/catch`. Errors that extend `AppError` become friendly messages.
4. `registry.findByEmail()` finds the customer; `customer.assertSlotFree()` checks double-booking
   **before** `qm.generateQueueNumber()` is called, so a refused booking never leaves a gap in the numbers.
5. `new Appointment(...)` validates all its fields; `setStatus('Confirmed')`; `customer.bookAppointment()`
   re-checks the future-date rule; `qm.addToQueue()` adds it to the Singleton queue.
6. `persist()` → `StorageService.save()` → `JSON.stringify()` calls every class's `toJSON()`.
7. The View is redrawn with `refreshQueueDisplay()`; all text passes through `escapeHtml()`.

## Questions to practise
| Question | Answer pointer |
|---|---|
| Why a Singleton? | Customer and staff screens must see the same queue and the same numbers; two queue objects would duplicate numbers (`QueueManager`) |
| Why `toJSON()`? | `JSON.stringify` cannot see `#private` fields; it returned `{}` (BUG-11). `toJSON()` lets the class choose what to expose |
| Why validate in the Model **and** the Controller? | Controller = fast feedback; Model = bad data can never get in even if the form is bypassed |
| What does `PATTERNS.EMAIL`'s `(?!.*\.\.)` do? | Negative look-ahead: rejects two dots in a row |
| Why `\p{L}` in the name regex? | Matches letters in any language, so "José" is allowed, with the `u` flag |
| Why compare the date parts after `new Date(...)`? | JavaScript turns 31 Feb into 3 Mar silently; comparing the parts catches it |
| Why does `callNext()` return `null` and not throw? | Your Checkpoint 2 design: an empty queue is a normal situation, the Controller shows an info message |
| What is the status state machine? | `Appointment.TRANSITIONS`: a table of allowed next statuses |
| Why is `resetInstance()` in a Singleton? | Only so tests (and *Reset data*) can start clean |
| How is corrupt saved data handled? | `StorageService.load()` catches the `JSON.parse` error, keeps a copy under `.corrupt`, throws a friendly `StorageError` |
| What did the regression tests find? | See report section 11 (12 defects) |
