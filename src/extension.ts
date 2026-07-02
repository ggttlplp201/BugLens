import * as vscode from 'vscode';
import { buildPrompt } from './prompt';
import { streamExplanation } from './llm';
import { BugLensPanel } from './panel';

const API_KEY_SECRET = 'buglens.apiKey';

let currentRequest: AbortController | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const explain = vscode.commands.registerCommand('buglens.explain', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      void vscode.window.showWarningMessage('BugLens: open a file and select the code you want explained.');
      return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    if (!selectedText.trim()) {
      void vscode.window.showWarningMessage('BugLens: select the code you think has a bug first.');
      return;
    }

    const apiKey = await getApiKey(context);
    if (!apiKey) return;

    const fileContent = editor.document.getText();
    const filename = editor.document.fileName.split(/[\\/]/).pop() ?? 'file';
    const startLine = selection.start.line + 1;
    // A selection ending at column 0 doesn't actually include that line
    const endLine = selection.end.character === 0 && selection.end.line > selection.start.line
      ? selection.end.line
      : selection.end.line + 1;
    const lineRange = startLine === endLine
      ? `line ${startLine}`
      : `lines ${startLine}–${endLine}`;

    const panel = BugLensPanel.show();
    panel.setHeader(filename, lineRange, selectedText);

    const sessionId = panel.getSessionId();
    const { system, user } = buildPrompt(
      filename,
      fileContent,
      selectedText,
      editor.document.offsetAt(selection.start),
      editor.document.offsetAt(selection.end)
    );

    currentRequest?.abort();
    const controller = new AbortController();
    currentRequest = controller;

    try {
      for await (const chunk of streamExplanation(system, user, apiKey, controller.signal)) {
        if (panel.isDisposed() || panel.getSessionId() !== sessionId) {
          controller.abort();
          return;
        }
        panel.appendChunk(chunk, sessionId);
      }
      panel.finish(sessionId);
    } catch (err) {
      if (controller.signal.aborted) return;
      panel.showError(err instanceof Error ? err.message : String(err), sessionId);
    }
  });

  const setApiKey = vscode.commands.registerCommand('buglens.setApiKey', async () => {
    const key = await promptForApiKey(context);
    if (key) {
      void vscode.window.showInformationMessage('BugLens: API key saved.');
    }
  });

  const clearApiKey = vscode.commands.registerCommand('buglens.clearApiKey', async () => {
    await context.secrets.delete(API_KEY_SECRET);
    void vscode.window.showInformationMessage('BugLens: API key cleared.');
  });

  context.subscriptions.push(explain, setApiKey, clearApiKey);
}

async function getApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
  const stored = await context.secrets.get(API_KEY_SECRET);
  if (stored) return stored;

  // Legacy fallback: key configured in settings before SecretStorage existed
  const fromSettings = vscode.workspace.getConfiguration('buglens').get<string>('apiKey', '');
  if (fromSettings) return fromSettings;

  return promptForApiKey(context);
}

async function promptForApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
  const provider = vscode.workspace.getConfiguration('buglens').get<string>('provider', 'openai');
  const key = await vscode.window.showInputBox({
    title: 'BugLens: Set API Key',
    prompt: `API key for ${provider} (stored securely in VS Code secret storage)`,
    password: true,
    ignoreFocusOut: true,
  });
  if (!key?.trim()) return undefined;
  await context.secrets.store(API_KEY_SECRET, key.trim());
  return key.trim();
}

export function deactivate(): void {
  currentRequest?.abort();
}
