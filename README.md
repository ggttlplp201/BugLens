# BugLens

A VS Code extension that explains the logic behind your code bugs — without fixing them for you.

Highlight a section of code you think is broken, right-click, and BugLens tells you **what your code actually does**, **what you likely intended**, and **the concept behind the gap**. No rewritten solutions. No copy-paste temptation.

---

## Why

When you ask an LLM to fix a bug, it hands you a clean rewrite that looks nothing like your original code. You copy-paste it, the tests pass, and you learned nothing. BugLens forces the explanation path: it reads your code and teaches you what went wrong, leaving the fix to you.

---

## Install

```bash
git clone https://github.com/ggttlplp201/BugLens.git
cd BugLens/buglens
npm install
npm run package
```

Then in VS Code: `Cmd+Shift+P` → **Extensions: Install from VSIX...** → select the generated `buglens-0.1.0.vsix`.

---

## Setup

1. `Cmd+Shift+P` → **BugLens: Set API Key** — the key is stored in VS Code's secret storage, never in plaintext settings. (You'll also be prompted automatically on first use.)
2. Optionally adjust provider and model in Settings (`Cmd+,`, search for **BugLens**):

| Setting | Description | Example |
|---|---|---|
| `buglens.provider` | LLM provider | `openai` (default) or `anthropic` |
| `buglens.model` | Model name; leave empty for the provider default (`gpt-4o` / `claude-sonnet-4-6`) | `gpt-4o-mini` |

**OpenAI models:** `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`

**Anthropic models:** `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`

To remove a stored key: `Cmd+Shift+P` → **BugLens: Clear API Key**.

---

## Usage

1. Open any code file
2. Highlight the section you think has a logic bug
3. Right-click → **BugLens: Explain this bug**
4. A panel opens on the right with three sections:

```
WHAT YOUR CODE DOES
───────────────────
[Explains what your code actually computes]

WHAT YOU LIKELY INTENDED
────────────────────────
[Explains what you were trying to achieve]

THE CONCEPT
───────────
[Explains the underlying principle, sometimes with a small example]
```

---

## Example

Given this buggy function:

```javascript
function total(items) {
  let sum = items.length;
  return sum;
}
```

Highlight `items.length`, right-click → BugLens: Explain this bug.

**What your code does**
`items.length` returns the number of elements in the array — in this case the count of items, not the total of their values.

**What you likely intended**
You want to sum the values stored in the array, not count how many elements there are.

**The concept**
`.length` is a property that tells you how many items are in the array. For `[10, 20, 30]`, `.length` returns `3` — not `60`.

---

## Cross-file bugs

BugLens doesn't just look at the current file. It also sends:

- files the current file **imports** (what the highlighted code depends on)
- files that **import the current file** (where the highlighted code is used — and where non-local bugs actually surface)

Try it: open `examples/store/inventory.js`, highlight the body of `lowestStock()`, and ask BugLens to explain. The function is flawless in isolation — the explanation should point out that `Array.prototype.sort` mutates the shared catalog, breaking the "last element is newest" invariant that `app.js` relies on. Run `node examples/store/app.js` to see the wrong output for yourself.

The panel shows a `context:` line listing exactly which related files were sent, or `context: none` when nothing relevant was found — so you can always tell what the model actually saw.

Context is capped (6 related files, ~24k characters) so large projects stay fast and cheap.

---

## Evaluating a model

Because BugLens sends the same prompt and the same cross-file context to whichever provider you pick, it doubles as a way to compare how well different models actually *understand a codebase* — not just how fluent they sound.

The `examples/store/` demo is designed for this. The bug is invisible in the highlighted function alone; a model only gets it right by reading the related file it was handed. Use it to score a model on three things:

1. **Did it use the context?** A passing answer names `app.js` and the specific broken assumption ("the last element is the newest product"). A failing one stays vague ("if you use the array elsewhere…") — a tell that it ignored the context even though the `context:` line confirms it was sent.
2. **Did it respect the constraint?** BugLens forbids handing over the fix. A disciplined model explains the in-place mutation with toy data and stops; a weaker one leaks the answer (`[...products].sort(...)`, "use slice/spread") despite being told not to.
3. **Was the diagnosis correct?** The root cause is `Array.prototype.sort` mutating the shared array — not the `slice`, not the comparator.

### Running the comparison

1. Open `examples/store/inventory.js` and highlight the body of `lowestStock()`.
2. Set `buglens.provider` to `openai` (leave `buglens.model` empty → `gpt-4o`), run **BugLens: Explain this bug**, and note the answer against the three criteria above.
3. Run **BugLens: Set API Key** with your Anthropic key, switch `buglens.provider` to `anthropic` (leave the model empty → `claude-sonnet-4-6`), and run it again on the same selection.
4. Compare. Both models received identical input, so any difference is the model — not the prompt or the context.

To pin exact models rather than the provider defaults, set `buglens.model` (e.g. `gpt-4o-mini`, `claude-haiku-4-5-20251001`) and repeat.

---

## Project Structure

```
buglens/
├── src/
│   ├── extension.ts   # Entry point — commands, API key storage, request lifecycle
│   ├── context.ts     # Gathers related files (imports + importers) from the workspace
│   ├── prompt.ts      # Builds the system + user prompt, caps context for large files
│   ├── llm.ts         # Streams from OpenAI or Anthropic (cancellable)
│   └── panel.ts       # WebView side panel renderer (theme-aware)
├── package.json
├── tsconfig.json
└── esbuild.js
```

---

## Development

```bash
npm install
npm run build       # one-time build
npm run watch       # rebuild on file changes
npm run typecheck   # strict TypeScript check
npm run package     # build a .vsix for installing
```

After rebuilding, reload the VS Code window for changes to take effect.

---

## Requirements

- VS Code 1.85 or later
- An OpenAI or Anthropic API key
- Node.js 18+ (for building from source)
