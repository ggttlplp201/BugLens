export interface Prompt {
  system: string;
  user: string;
}

export function buildPrompt(
  filename: string,
  fileContent: string,
  selectedText: string
): Prompt {
  const system = [
    'You are a coding tutor. A developer has highlighted a section of code they believe has a logic bug.',
    'Your job is to explain what is wrong and why — never provide a corrected version of their code.',
    'You may use short illustrative snippets (e.g. showing what an expression evaluates to) but never rewrite the user\'s logic for them.',
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

  const user = [
    `File: ${filename}`,
    '',
    'Full file:',
    fileContent,
    '',
    'Highlighted code (the suspected bug):',
    selectedText,
  ].join('\n');

  return { system, user };
}
