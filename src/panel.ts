import * as vscode from 'vscode';
import * as crypto from 'crypto';

export class BugLensPanel {
  private static current: BugLensPanel | undefined;
  private readonly webviewPanel: vscode.WebviewPanel;
  private buffer = '';
  private sessionId = 0;
  private disposed = false;

  static show(): BugLensPanel {
    if (BugLensPanel.current) {
      BugLensPanel.current.webviewPanel.reveal(vscode.ViewColumn.Two, true);
      BugLensPanel.current.reset();
      return BugLensPanel.current;
    }
    const webviewPanel = vscode.window.createWebviewPanel(
      'buglens',
      'BugLens',
      { viewColumn: vscode.ViewColumn.Two, preserveFocus: true },
      { enableScripts: true, retainContextWhenHidden: true }
    );
    BugLensPanel.current = new BugLensPanel(webviewPanel);
    webviewPanel.onDidDispose(() => {
      if (BugLensPanel.current) {
        BugLensPanel.current.disposed = true;
      }
      BugLensPanel.current = undefined;
    });
    return BugLensPanel.current;
  }

  private constructor(webviewPanel: vscode.WebviewPanel) {
    this.webviewPanel = webviewPanel;
    this.webviewPanel.webview.html = BugLensPanel.getHtml();
  }

  isDisposed(): boolean {
    return this.disposed;
  }

  getSessionId(): number {
    return this.sessionId;
  }

  reset(): void {
    this.buffer = '';
    this.sessionId++;
    this.post({ type: 'reset' });
  }

  setHeader(filename: string, lineRange: string, selectedCode: string): void {
    this.post({ type: 'header', filename, lineRange, selectedCode });
  }

  appendChunk(chunk: string, forSession: number): void {
    if (forSession !== this.sessionId) return;
    this.buffer += chunk;
    this.post({ type: 'update', text: this.buffer });
  }

  finish(forSession: number): void {
    if (forSession !== this.sessionId) return;
    this.post({ type: 'done' });
  }

  showError(message: string, forSession: number): void {
    if (forSession !== this.sessionId) return;
    this.post({ type: 'error', message });
  }

  private post(message: unknown): void {
    if (this.disposed) return;
    void this.webviewPanel.webview.postMessage(message);
  }

  private static getHtml(): string {
    const nonce = crypto.randomBytes(16).toString('hex');
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
  body {
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
    font-size: 13px;
    padding: 16px;
    line-height: 1.6;
    margin: 0;
  }
  #meta {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-editor-font-family, monospace);
    margin-bottom: 10px;
  }
  #selected-code {
    margin-bottom: 16px;
  }
  #selected-code pre {
    margin: 0;
    max-height: 160px;
    overflow-y: auto;
  }
  .section {
    margin-bottom: 20px;
  }
  .section-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 6px;
    border-bottom: 1px solid var(--vscode-panel-border, #333);
    padding-bottom: 4px;
  }
  code {
    background: var(--vscode-textCodeBlock-background, rgba(128, 128, 128, 0.15));
    padding: 1px 5px;
    border-radius: 3px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px;
  }
  pre {
    background: var(--vscode-textCodeBlock-background, rgba(128, 128, 128, 0.15));
    padding: 10px 12px;
    border-radius: 4px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }
  #status {
    color: var(--vscode-descriptionForeground);
    font-style: italic;
  }
  .cursor {
    display: inline-block;
    width: 7px;
    height: 13px;
    background: var(--vscode-foreground);
    vertical-align: text-bottom;
    animation: blink 1s step-start infinite;
  }
  @keyframes blink {
    50% { opacity: 0; }
  }
  .error-box {
    color: var(--vscode-errorForeground, #f48771);
    background: var(--vscode-inputValidation-errorBackground, rgba(244, 135, 113, 0.1));
    padding: 12px;
    border-radius: 4px;
    border-left: 3px solid var(--vscode-errorForeground, #f48771);
  }
</style>
</head>
<body>
<div id="meta"></div>
<div id="selected-code"></div>
<div id="content"><div id="status">Select code and run BugLens: Explain this bug.</div></div>

<script nonce="${nonce}">
  var streaming = false;

  window.addEventListener('message', function(event) {
    var msg = event.data;
    if (msg.type === 'reset') {
      streaming = false;
      document.getElementById('meta').textContent = '';
      document.getElementById('selected-code').innerHTML = '';
      document.getElementById('content').innerHTML = '<div id="status">Analyzing\\u2026</div>';
    } else if (msg.type === 'header') {
      var lineStr = msg.lineRange ? ' \\u00b7 ' + msg.lineRange : '';
      document.getElementById('meta').textContent = msg.filename + lineStr;
      document.getElementById('selected-code').innerHTML =
        '<pre>' + escapeHtml(msg.selectedCode) + '</pre>';
      document.getElementById('content').innerHTML = '<div id="status">Analyzing\\u2026</div>';
    } else if (msg.type === 'update') {
      streaming = true;
      renderContent(msg.text);
    } else if (msg.type === 'done') {
      streaming = false;
      var cursor = document.querySelector('.cursor');
      if (cursor) cursor.remove();
    } else if (msg.type === 'error') {
      streaming = false;
      document.getElementById('content').innerHTML =
        '<div class="error-box">' + escapeHtml(msg.message) + '</div>';
    }
  });

  function renderContent(text) {
    var sections = parseSections(text);
    if (sections.length === 0) {
      document.getElementById('content').innerHTML =
        '<div id="status">Analyzing\\u2026</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < sections.length; i++) {
      var isLast = i === sections.length - 1;
      html +=
        '<div class="section">' +
          '<div class="section-label">' + escapeHtml(sections[i][0]) + '</div>' +
          '<div class="section-body">' + formatBody(sections[i][1]) +
            (isLast && streaming ? '<span class="cursor"></span>' : '') +
          '</div>' +
        '</div>';
    }
    document.getElementById('content').innerHTML = html;
  }

  function parseSections(text) {
    // Matches **Title** markers — two asterisks, title text, two asterisks
    var positions = [];
    var i = 0;
    while (i < text.length - 1) {
      if (text[i] === '*' && text[i+1] === '*') {
        var end = text.indexOf('**', i + 2);
        if (end !== -1) {
          positions.push({ title: text.slice(i + 2, end), bodyStart: end + 2 });
          i = end + 2;
          continue;
        }
      }
      i++;
    }
    var sections = [];
    for (var j = 0; j < positions.length; j++) {
      var bodyEnd = j + 1 < positions.length
        ? positions[j + 1].bodyStart - positions[j + 1].title.length - 4
        : text.length;
      sections.push([
        positions[j].title.trim(),
        text.slice(positions[j].bodyStart, bodyEnd).trim()
      ]);
    }
    return sections;
  }

  function formatBody(text) {
    // Code blocks: lines indented 4+ spaces are wrapped in <pre>
    var lines = text.split('\\n');
    var result = '';
    var inBlock = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!inBlock && line.startsWith('    ')) {
        result += '<pre>';
        inBlock = true;
      } else if (inBlock && !line.startsWith('    ') && line.trim() !== '') {
        result += '</pre>';
        inBlock = false;
      }
      if (inBlock) {
        result += escapeHtml(line.slice(4)) + '\\n';
      } else {
        result += formatInline(line) + '<br>';
      }
    }
    if (inBlock) result += '</pre>';
    return result;
  }

  function formatInline(text) {
    // Replace inline code: text between backtick characters (char code 96)
    var tick = String.fromCharCode(96);
    var parts = text.split(tick);
    var out = '';
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        out += escapeHtml(parts[i]);
      } else {
        out += '<code>' + escapeHtml(parts[i]) + '</code>';
      }
    }
    return out;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
</script>
</body>
</html>`;
  }
}
