# BugLens

A VS Code extension that explains the logic behind your code bugs — without fixing them for you.

Highlight a section of code you think is broken, right-click, and BugLens tells you **what your code actually does**, **what you likely intended**, and **the concept behind the gap**. No rewritten solutions. No copy-paste temptation.

---

## Why

When you ask an LLM to fix a bug, it hands you a clean rewrite that looks nothing like your original code. You copy-paste it, the tests pass, and you learned nothing. BugLens forces the explanation path: it reads your code and teaches you what went wrong, leaving the fix to you.

---

## Install

### Option A: Install from folder (development)

```bash
git clone https://github.com/ggttlplp201/BugLens.git
cd BugLens/buglens
npm install
npm run build
cp -r . ~/.vscode/extensions/buglens-0.0.1
```

Then in VS Code: `Cmd+Shift+P` → **Developer: Reload Window**

### Option B: Install from VSIX (once packaged)

```bash
npm install -g vsce
cd buglens
vsce package
```

Then in VS Code: `Cmd+Shift+P` → **Extensions: Install from VSIX...** → select the generated `.vsix` file.

---

## Setup

1. Open VS Code Settings (`Cmd+,` on Mac, `Ctrl+,` on Windows/Linux)
2. Search for **BugLens**
3. Set the following:

| Setting | Description | Example |
|---|---|---|
| `buglens.provider` | LLM provider | `openai` or `anthropic` |
| `buglens.model` | Model name | `gpt-4o` (OpenAI) or `claude-sonnet-4-6` (Anthropic) |
| `buglens.apiKey` | Your API key | `sk-...` or `sk-ant-...` |

**OpenAI models:** `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`

**Anthropic models:** `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`

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
│   ├── extension.ts   # Entry point — registers command, orchestrates flow
│   ├── prompt.ts      # Builds the system + user prompt
│   ├── llm.ts         # Streams from OpenAI or Anthropic
│   └── panel.ts       # WebView side panel renderer
├── dist/
│   └── extension.js   # Bundled output (esbuild)
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
```

After rebuilding, reload the VS Code window for changes to take effect.

---

## Requirements

- VS Code 1.85 or later
- An OpenAI or Anthropic API key
- Node.js 18+ (for building from source)
