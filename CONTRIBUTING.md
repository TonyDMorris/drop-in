# Contributing to Drop In

Thanks for taking a look.

## Getting set up

```bash
npm install
npm test          # unit + integration
```

Press <kbd>F5</kbd> in VS Code to launch an Extension Development Host with Drop In loaded.

## How the code is laid out

Everything with real logic lives in modules that **do not import `vscode`**, so it can be tested
with plain Mocha and no editor. `vscode` is imported only by `extension.ts`, `ui.ts`, and
`vscodeFs.ts`.

| Path | Role |
| --- | --- |
| `src/clipboard/` | Per-platform readers behind one `readClipboardFiles()`, plus the writer used to restore the clipboard after the <kbd>⌘V</kbd> focus probe |
| `src/plan.ts` | Decides destinations and resolves name clashes. No I/O — `exists` and `ask` are injected |
| `src/copy.ts` | Runs a plan, collecting failures rather than aborting |
| `src/naming.ts`, `src/paths.ts`, `src/target.ts` | Finder-style renaming, platform-aware path comparison, target folder resolution |
| `src/extension.ts` | Command registration and wiring |

If you add logic, put it in the pure layer and unit-test it there.

## Tests

- `npm run test:unit` — fast, no editor. The clipboard parsers are fixture-driven, which is how
  the Windows and Linux paths stay covered from a macOS machine.
- `npm run test:integration` — downloads VS Code and drives real copies against temp folders.

## Adding a platform

Add a module under `src/clipboard/` exporting `probes()` and `parse()`, register it in
`src/clipboard/index.ts`, and add fixture tests. Probes are tried in order and the first that
yields paths wins, so several clipboard flavours can coexist.
