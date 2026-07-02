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
| `buglens.model` | Model name | `gpt-4o` (OpenAI) or `claude-sonnet-4-6` (Anthropic) |

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

## Project Structure

```
buglens/
├── src/
│   ├── extension.ts   # Entry point — commands, API key storage, request lifecycle
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
