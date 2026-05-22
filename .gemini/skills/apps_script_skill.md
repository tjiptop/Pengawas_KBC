# Google Apps Script Local Developer Skill

This skill acts as a guidelines and execution handbook for developer agents and engineers working on this Google Apps Script project (**Madrasah Survey App**). It ensures consistent patterns, reliable push/pull synchronization, and safety when modifying server-side (.js/.gs) or client-side (.html) code.

---

## 🛠 Clasp & Git Sync Workflow

Always adhere to the following sync pipeline to avoid code overrides and state conflicts:

### 1. Synchronizing Before Development
Before editing any file, check for online updates (e.g. if the user edited code via the browser editor):
```bash
npm run clasp:pull
```
Use `git diff` to see what changed and ensure you do not overwrite user changes.

### 2. local Changes Verification
Use Google Apps Script types (`@types/google-apps-script`) for IntelliSense and syntax checking:
- Ensure classes like `SpreadsheetApp`, `HtmlService`, `CacheService`, `DriveApp`, and `PropertiesService` are recognized.
- Do not use modern ES modules (`export`, `import`, `require`) directly in the source files, as Google Apps Script operates in a flat global namespace.

### 3. Pushing and Deploying
Upload your local edits back to the Google Apps Script project container:
```bash
npm run clasp:push
```
Or use the live watcher during active development:
```bash
npm run clasp:watch
```

### 4. Git Tracking
Commit all successful, working changes to Git to keep a robust history:
```bash
git status
git add .
git commit -m "Refactor: description of changes"
```

---

## 🧱 Project Architecture & Best Practices

The **Madrasah Survey App** follows specific architectural patterns. Adhere to them in all edits:

### 1. HTML Rendering & Partials Integration
HTML files use custom server-side rendering helpers to stitch layouts together:
- Always use the `include(filename)` helper (defined in `Code.js`) to embed styles and client-side scripts inside templates:
  ```html
  <!-- To include css.html -->
  <?!= include('css'); ?>

  <!-- To include js-core.html -->
  <?!= include('js-core'); ?>
  ```
- Client-side JavaScript is modularized into dedicated `.html` files (e.g., `js-core.html`, `js-auth.html`, `js-manager.html`, `js-form-engine.html`) so they are easy to manage locally. Do not write large blocks of raw JS directly inside `index.html`.

### 2. Database (Google Sheets) & Data Services
- Use the central `getDb()` and `getData(sheetName, useCache, usePersistent)` utility methods to fetch data from the spreadsheet.
- High-frequency data access MUST go through the `CacheManager` or `DataService` layer to prevent hitting Google Sheets API rate limits.
- Sanitization: Always use `sanitizeObjectRecursive(obj)` and `sanitizeFormulaInjection(str)` before saving data into spreadsheets to prevent XSS and Formula Injection attacks.

### 3. Settings & Credentials
- **Never hardcode passwords, secret API keys, or private spreadsheet IDs** in the source code.
- Always use `PropertiesService.getScriptProperties()` for environment configuration:
  ```javascript
  const props = PropertiesService.getScriptProperties();
  const secretKey = props.getProperty('SECRET_KEY');
  ```

---

## ⚠️ Google Apps Script Limitations & Constraints

Remember these hard platform constraints:
1. **Flat Namespace**: Files are loaded alphabetically in the global scope. Function names and global constants must be unique across ALL files.
2. **No Native Node.js Modules**: You cannot use `npm` packages directly in server-side JS. You cannot run `fs`, `path`, `crypto`, `http`, etc.
3. **Execution Limits**: Individual script executions are capped at 6 minutes (30 minutes for Google Workspace Enterprise). Keep operations optimized.
4. **No `.env` Files**: Apps Script does not read local `.env` files. Use Script Properties instead.
