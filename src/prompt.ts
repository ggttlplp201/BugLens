import type { RelatedFile } from './context';

export interface Prompt {
  system: string;
  user: string;
}

// Roughly 8k tokens of file context — plenty for explaining a local logic bug
// without sending an entire large file on every request.
const MAX_CONTEXT_CHARS = 24000;
const MAX_SELECTION_CHARS = 12000;

export function buildPrompt(
  filename: string,
  fileContent: string,
  selectedText: string,
  selectionStart: number,
  selectionEnd: number,
  relatedFiles: RelatedFile[] = []
): Prompt {
  const system = [
    'You are a coding tutor. A developer has highlighted a section of code they believe has a logic bug.',
    'Your job is to explain what is wrong and why — never provide a corrected version of their code.',
    'You may use short illustrative snippets (e.g. showing what an expression evaluates to) but never rewrite the user\'s logic for them.',
    'You may also receive related files from the same project. The highlighted code can look correct in isolation while breaking an assumption elsewhere — check how it is used by and interacts with the related files before deciding what is wrong.',
    'No emojis. Respond using exactly this structure:',
    '',
    '**What your code does**',
    '[explain the actual behavior]',
    '',
    '**What you likely intended**',
    '[explain the expected behavior]',
    '',
    '**The concept**',
    '[explain the underlying principle, optionally with a small illustrative snippet]',
  ].join('\n');

  const relatedSections = relatedFiles.flatMap(file => [
    '',
    `Related file: ${file.relativePath}`,
    file.content,
  ]);

  const user = [
    `File: ${filename}`,
    '',
    'Full file:',
    windowAroundSelection(fileContent, selectionStart, selectionEnd),
    ...relatedSections,
    '',
    'Highlighted code (the suspected bug):',
    truncateMiddle(selectedText, MAX_SELECTION_CHARS),
  ].join('\n');

  return { system, user };
}

function windowAroundSelection(
  fileContent: string,
  selectionStart: number,
  selectionEnd: number
): string {
  if (fileContent.length <= MAX_CONTEXT_CHARS) {
    return fileContent;
  }
  const spare = Math.max(0, MAX_CONTEXT_CHARS - (selectionEnd - selectionStart));
  const start = Math.max(0, selectionStart - Math.floor(spare / 2));
  const end = Math.min(fileContent.length, selectionEnd + Math.ceil(spare / 2));
  const prefix = start > 0 ? '… [file truncated] …\n' : '';
  const suffix = end < fileContent.length ? '\n… [file truncated] …' : '';
  // A selection larger than the cap would otherwise make the window unbounded
  return prefix + truncateMiddle(fileContent.slice(start, end), MAX_CONTEXT_CHARS) + suffix;
}

function truncateMiddle(text: string, max: number): string {
  if (text.length <= max) return text;
  const half = Math.floor(max / 2);
  return text.slice(0, half) + '\n… [truncated] …\n' + text.slice(text.length - half);
}
