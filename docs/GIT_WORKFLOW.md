# Git & GitHub Workflow — AppointEase

## Where the repository stands today (please read first)
Checked in the submitted zip:
- `appointease/` was initialised with `git init` but has **no commits** — nothing is tracked yet.
- Inside it is a folder `online banking/` that is a *separate* clone of
  `github.com/andrebanvuhavuha09-cloud/online-banking` (one "Initial commit" only). It is a different
  repository and must **not** be inside the project folder.

So the commit history, branching and merging required by Checkpoint 3 still have to be created.
Do it for real from now on — real commits by both of you, with real dates. Do not copy or back-date history.

## One-time setup
1. Decide which of you creates the GitHub repository: **`appointease-itdi110`** (empty — no README).
   Add the other member under *Settings → Collaborators*.
2. Move the stray folder out of the project: close VS Code, then move `online banking/` somewhere else
   (e.g. your Desktop).
3. In the project folder, make the first commit (this records your Checkpoint 2 work honestly):
   ```bash
   cd appointease
   git add .
   git commit -m "chore: Checkpoint 2 prototype (OOP + MVC + Singleton)"
   ```
   *(Do this BEFORE copying in the Checkpoint 3 files, so the improvements show up as commits.)*
4. Connect and push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<owner>/appointease-itdi110.git
   git push -u origin main
   ```
   If the folder still points at the old remote, fix it with `git remote set-url origin <new-url>`.
5. The other member clones it:
   ```bash
   git clone https://github.com/<owner>/appointease-itdi110.git
   git config user.name "Your Name"      # each person uses their OWN name + GitHub email
   git config user.email "you@example.com"
   ```

## Branches and rules
| Branch | Use |
|---|---|
| `main` | always working; changed only by merging a Pull Request |
| `feature/<topic>` | new functionality |
| `fix/<topic>` | bug fixes found by testing |
| `test/<topic>` | tests |
| `docs/<topic>` | README / report |

Every Pull Request is reviewed and merged by the **other** member.

## Commit messages
`<type>: <what changed> (<why>)` — types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`.
Example: `fix: reject cancelling a Completed appointment (BUG-08 found by regression test)`

## Suggested split of the Checkpoint 3 work
Each branch = one Pull Request. Share them between you so that **both** of you build, test and explain
design, code, tests and documentation. Add the files for a branch, run `npm test`, then commit.

| # | Branch | Files | Commit ideas |
|---|---|---|---|
| 1 | `test/regression-baseline` | `tests/regression.test.js`, `tests/helpers.js`, `package.json` | `test: add regression tests that expose 11 defects` (run against the Checkpoint 2 code; copy the failing output) |
| 2 | `feature/error-classes` | `models/errors.js` | `feat: add AppError, ValidationError, BusinessRuleError, StorageError` |
| 3 | `feature/regex-validation` | `utils/Validator.js`, `tests/validator.test.js`, `models/Person.js`, `models/ServiceType.js`, `tests/person.test.js`, `tests/service.test.js` | `feat: regex validation (BUG-01, BUG-02, BUG-09)` |
| 4 | `fix/business-rules` | `models/Appointment.js`, `Customer.js`, `Staff.js`, `QueueManager.js`, `tests/appointment.test.js`, `customer.test.js`, `queue.test.js`, `tests/sanity-check.mjs` | `fix: status life-cycle (BUG-07, BUG-08)` / `fix: booking rules (BUG-04, 05, 06)` / `fix: queue refuses junk (BUG-10)` |
| 5 | `feature/json-storage` | `models/CustomerRegistry.js`, `services/StorageService.js`, `toJSON` parts, `tests/registry.test.js`, `tests/storage.test.js` | `feat: toJSON on all models (BUG-11)` / `feat: StorageService with corrupt-data handling` |
| 6 | `feature/controller-validation-ui` | `js/app.js`, `index.html`, `css/style.css`, `tests/ui-smoke.mjs`, `tests/ui-xss.mjs` | `feat: inline field errors` / `fix: escape HTML in the page (BUG-12)` / `feat: save after every change` |
| 7 | `docs/readme-and-report` | `README.md`, `docs/` | `docs: README with run and test instructions` |

Branches 1 and 2 can be done in parallel; 3–6 depend on 2. Resolve any merge conflict yourselves — that is
useful "branching and merging" evidence.

## Commands you will use
```bash
git checkout main && git pull
git checkout -b feature/regex-validation
# ...edit, then:
npm test
git add utils/Validator.js tests/validator.test.js
git commit -m "feat: add Validator with regex patterns for name, email and phone"
git push -u origin feature/regex-validation
# open a Pull Request on GitHub -> teammate reviews -> "Merge pull request"
git checkout main && git pull && git branch -d feature/regex-validation

# evidence for the report
git log --oneline --graph --decorate --all
git shortlog -sn
git tag -a checkpoint-3 -m "Checkpoint 3 submission" && git push --tags
```

## If a merge conflict happens
1. `git checkout <your-branch>` then `git merge main`.
2. Open each file Git lists; keep the correct lines; delete the `<<<<<<<`, `=======`, `>>>>>>>` markers.
3. `npm test`, then `git add <files>` and `git commit`.
