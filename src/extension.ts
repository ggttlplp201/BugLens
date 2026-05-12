import * as vscode from 'vscode';
import { buildPrompt } from './prompt';
import { streamExplanation } from './llm';
import { BugLensPanel } from './panel';

export function activate(context: vscode.ExtensionContext): void {
  const command = vscode.commands.registerCommand('buglens.explain', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    if (!selectedText.trim()) return;

    const fileContent = editor.document.getText();
    const filename = editor.document.fileName.split(/[\\/]/).pop() ?? 'file';
    const startLine = selection.start.line + 1;
    const endLine = selection.end.line + 1;
    const lineRange = startLine === endLine
      ? `line ${startLine}`
      : `lines ${startLine}–${endLine}`;

    const panel = BugLensPanel.show();
    panel.setHeader(filename, lineRange);

    const sessionId = panel.getSessionId();
    const { system, user } = buildPrompt(filename, fileContent, selectedText);

    try {
      for await (const chunk of streamExplanation(system, user)) {
        panel.appendChunk(chunk, sessionId);
      }
    } catch (err) {
      panel.showError(err instanceof Error ? err.message : String(err));
    }
  });

  context.subscriptions.push(command);
}

export function deactivate(): void {}
