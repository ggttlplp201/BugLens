import * as vscode from 'vscode';
import * as path from 'path';

export interface RelatedFile {
  relativePath: string;
  content: string;
}

const RESOLVE_EXTENSIONS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const MAX_RELATED_FILES = 6;
const MAX_CHARS_PER_FILE = 8000;
const MAX_TOTAL_CHARS = 24000;
const MAX_FILES_SCANNED = 300;
const MAX_FILE_BYTES = 262144;

// Matches the specifier in: import ... from 'x' | import('x') | require('x') | export ... from 'x'
const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

/**
 * Collects project files related to the document: files it imports (so the
 * model sees what the highlighted code depends on) and files that import it
 * (so the model sees how the highlighted code is used elsewhere — where
 * non-local bugs actually surface).
 */
export async function gatherRelatedFiles(document: vscode.TextDocument): Promise<RelatedFile[]> {
  if (document.uri.scheme !== 'file') return [];

  const seen = new Set<string>([document.uri.fsPath]);
  const related: vscode.Uri[] = [];

  // Importers reveal where non-local bugs surface, so they get reserved slots
  for (const uri of await resolveImports(document)) {
    if (related.length >= MAX_RELATED_FILES - 2) break;
    if (!seen.has(uri.fsPath)) {
      seen.add(uri.fsPath);
      related.push(uri);
    }
  }
  for (const uri of await findImporters(document)) {
    if (related.length >= MAX_RELATED_FILES) break;
    if (!seen.has(uri.fsPath)) {
      seen.add(uri.fsPath);
      related.push(uri);
    }
  }

  const baseDir = vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath
    ?? path.dirname(document.uri.fsPath);
  const results: RelatedFile[] = [];
  let totalChars = 0;
  for (const uri of related.slice(0, MAX_RELATED_FILES)) {
    const content = await readCapped(uri);
    if (content === undefined) continue;
    if (totalChars + content.length > MAX_TOTAL_CHARS) break;
    totalChars += content.length;
    results.push({ relativePath: path.relative(baseDir, uri.fsPath), content });
  }
  return results;
}

async function resolveImports(document: vscode.TextDocument): Promise<vscode.Uri[]> {
  const dir = path.dirname(document.uri.fsPath);
  const uris: vscode.Uri[] = [];
  for (const match of document.getText().matchAll(IMPORT_RE)) {
    const specifier = match[1] ?? match[2];
    if (!specifier || !specifier.startsWith('.')) continue;
    const resolved = await resolveSpecifier(dir, specifier);
    if (resolved) uris.push(resolved);
  }
  return uris;
}

async function resolveSpecifier(dir: string, specifier: string): Promise<vscode.Uri | undefined> {
  const base = path.resolve(dir, specifier);
  const candidates = RESOLVE_EXTENSIONS.map(ext => base + ext)
    .concat(RESOLVE_EXTENSIONS.slice(1).map(ext => path.join(base, 'index' + ext)));
  for (const candidate of candidates) {
    const uri = vscode.Uri.file(candidate);
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.type === vscode.FileType.File) return uri;
    } catch {
      // candidate doesn't exist — try the next extension
    }
  }
  return undefined;
}

async function findImporters(document: vscode.TextDocument): Promise<vscode.Uri[]> {
  const folder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (!folder) return [];

  // A file importing this one must mention its basename in a relative specifier
  const basename = path.basename(document.uri.fsPath).replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, '');
  const mentionRe = new RegExp(
    `['"]\\.{1,2}(?:/[^'"]*)*/${escapeRegExp(basename)}(?:\\.[a-z]+)?['"]`
  );

  const files = await vscode.workspace.findFiles(
    new vscode.RelativePattern(folder, '**/*.{js,jsx,ts,tsx,mjs,cjs}'),
    '**/node_modules/**',
    MAX_FILES_SCANNED
  );

  const importers: vscode.Uri[] = [];
  for (const uri of files) {
    if (uri.fsPath === document.uri.fsPath) continue;
    const content = await readCapped(uri, /* forScan */ true);
    if (content === undefined || !mentionRe.test(content)) continue;
    // The basename mention is only a cheap prefilter — a path like
    // './other/inventory' can point at a different module entirely,
    // so confirm by resolving the file's actual import specifiers
    if (await importsFile(content, path.dirname(uri.fsPath), document.uri.fsPath)) {
      importers.push(uri);
      if (importers.length >= MAX_RELATED_FILES) break;
    }
  }
  return importers;
}

async function importsFile(content: string, fromDir: string, targetPath: string): Promise<boolean> {
  for (const match of content.matchAll(IMPORT_RE)) {
    const specifier = match[1] ?? match[2];
    if (!specifier || !specifier.startsWith('.')) continue;
    const resolved = await resolveSpecifier(fromDir, specifier);
    if (resolved?.fsPath === targetPath) return true;
  }
  return false;
}

async function readCapped(uri: vscode.Uri, forScan = false): Promise<string | undefined> {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    if (stat.size > MAX_FILE_BYTES) return undefined;
    const bytes = await vscode.workspace.fs.readFile(uri);
    const text = Buffer.from(bytes).toString('utf8');
    if (forScan) return text;
    return text.length > MAX_CHARS_PER_FILE
      ? text.slice(0, MAX_CHARS_PER_FILE) + '\n… [truncated] …'
      : text;
  } catch {
    return undefined;
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
