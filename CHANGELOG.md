# Changelog

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
