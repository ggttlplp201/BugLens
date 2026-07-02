# Changelog

## 0.2.3

- The panel now shows which related files were sent as context
  (`context: examples/store/app.js` or `context: none`)
- Importer scanning is proximity-first and always includes the current
  file's own subtree, so large monorepo workspaces no longer exhaust the
  scan budget before reaching nearby files
- Directory imports of index files (`import './store'` → `store/index.js`)
  are now detected
- Fixed a race where a slow older request could cancel a newer one

## 0.2.2

- Hardened the tutor prompt: the model may no longer show corrected code, use
  the user's identifiers in snippets, or name the API that would implement the
  fix — snippets may only demonstrate the surprising behavior on toy data
- When a bug breaks an assumption in a related file, the model must now name
  that file and the invariant it violates

## 0.2.1

- Triple-backtick code fences in explanations now render as proper code blocks
  (previously only 4-space-indented blocks were recognized)
- The highlighted-code preview expands to full lines and strips common
  indentation, so selections starting mid-line no longer display skewed

## 0.2.0

- Cross-file context: the prompt now includes files the current file imports
  AND files that import it, so bugs that only surface elsewhere in the project
  (in-place mutation, broken invariants, shared state) can be explained
- Empty `buglens.model` now resolves to the provider's default model
  (`gpt-4o` for OpenAI, `claude-sonnet-4-6` for Anthropic) — switching provider
  no longer requires also changing the model
- New multi-file demo in `examples/store/` with a bug that looks correct in isolation

## 0.1.0

- API keys now stored in VS Code secret storage via **BugLens: Set API Key** (the `buglens.apiKey` setting is deprecated but still honored)
- Panel follows your VS Code color theme instead of hardcoded dark colors
- Highlighted code is shown at the top of the explanation panel
- In-flight requests are cancelled when you start a new one or close the panel
- Large files are trimmed to a window around your selection before being sent to the model
- Clear warnings when invoked without an editor or selection
- Updated OpenAI and Anthropic SDKs; packaging metadata for `vsce package`

## 0.0.1

- Initial MVP: select code → right-click → structured three-part explanation, streamed into a side panel
