import * as vscode from 'vscode';

export class BugLensPanel {
  private static current: BugLensPanel | undefined;
  private readonly webviewPanel: vscode.WebviewPanel;
  private buffer = '';
  private sessionId = 0;

  static show(): BugLensPanel {
    if (BugLensPanel.current) {
      BugLensPanel.current.webviewPanel.reveal(vscode.ViewColumn.Two);
      BugLensPanel.current.reset();
      return BugLensPanel.current;
    }
    const webviewPanel = vscode.window.createWebviewPanel(
      'buglens',
      'BugLens',
      vscode.ViewColumn.Two,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    BugLensPanel.current = new BugLensPanel(webviewPanel);
    webviewPanel.onDidDispose(() => {
      BugLensPanel.current = undefined;
    });
    return BugLensPanel.current;
  }

  private constructor(webviewPanel: vscode.WebviewPanel) {
    this.webviewPanel = webviewPanel;
    this.webviewPanel.webview.html = BugLensPanel.getHtml();
  }

  reset(): void {
    this.buffer = '';
    this.sessionId++;
    this.webviewPanel.webview.postMessage({ type: 'reset' });
  }

  setHeader(filename: string, lineRange: string): void {
    this.webviewPanel.webview.postMessage({ type: 'header', filename, lineRange });
  }

  appendChunk(chunk: string, forSession: number): void {
    if (forSession !== this.sessionId) return;
    this.buffer += chunk;
    this.webviewPanel.webview.postMessage({ type: 'update', text: this.buffer });
  }

  getSessionId(): number {
    return this.sessionId;
  }

  showError(message: string): void {
    this.webviewPanel.webview.postMessage({ type: 'error', message });
  }

  private static getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>
  body {
    background: #1e1e1e;
    color: #d4d4d4;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    padding: 16px;
    line-height: 1.6;
    margin: 0;
  }
  #meta {
    font-size: 11px;
    color: #888;
    font-family: monospace;
    margin-bottom: 10px;
  }
  .section {
    margin-bottom: 20px;
  }
  .section-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #888;
    margin-bottom: 6px;
    border-bottom: 1px solid #333;
    padding-bottom: 4px;
  }
  .section-body {
    color: #ccc;
  }
  code {
    background: #2a2a2a;
    padding: 1px 5px;
    border-radius: 3px;
    font-family: 'Cascadia Code', 'Fira Code', monospace;
    font-size: 12px;
    color: #dcdcaa;
  }
  pre {
    background: #2a2a2a;
    padding: 10px 12px;
    border-radius: 4px;
    font-family: 'Cascadia Code', 'Fira Code', monospace;
    font-size: 12px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
    color: #d4d4d4;
  }
  #status {
    color: #888;
    font-style: italic;
  }
  .error-box {
    color: #f48771;
    background: #2a2a2a;
    padding: 12px;
    border-radius: 4px;
    border-left: 3px solid #f48771;
  }
</style>
</head>
<body>
<div id="meta"></div>
<div id="content"><div id="status">Waiting...</div></div>

<script>
  window.addEventListener('message', function(event) {
    var msg = event.data;
    if (msg.type === 'reset') {
      document.getElementById('meta').textContent = '';
      document.getElementById('content').innerHTML = '<div id="status">Analyzing...</div>';
    } else if (msg.type === 'header') {
      var lineStr = msg.lineRange ? ' \xb7 ' + msg.lineRange : '';
      document.getElementById('meta').textContent = msg.filename + lineStr;
      document.getElementById('content').innerHTML = '<div id="status">Analyzing...</div>';
    } else if (msg.type === 'update') {
      renderContent(msg.text);
    } else if (msg.type === 'error') {
      document.getElementById('content').innerHTML =
        '<div class="error-box">' + escapeHtml(msg.message) + '</div>';
    }
  });

  function renderContent(text) {
    var sections = parseSections(text);
    if (sections.length === 0) {
      document.getElementById('content').innerHTML =
        '<div id="status">Analyzing...</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < sections.length; i++) {
      html +=
        '<div class="section">' +
          '<div class="section-label">' + escapeHtml(sections[i][0]) + '</div>' +
          '<div class="section-body">' + formatBody(sections[i][1]) + '</div>' +
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
    // Code blocks: lines starting with 4 spaces or wrapped in triple-backtick-like patterns
    // For MVP: wrap any line indented 4+ spaces in <pre>
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
