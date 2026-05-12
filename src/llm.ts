import * as vscode from 'vscode';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export async function* streamExplanation(
  system: string,
  user: string
): AsyncGenerator<string> {
  const config = vscode.workspace.getConfiguration('buglens');
  const provider = config.get<string>('provider', 'openai');
  const model = config.get<string>('model', 'gpt-4o');
  const apiKey = config.get<string>('apiKey', '');

  if (!apiKey) {
    throw new Error(
      'No API key set. Go to Settings and add your key under buglens.apiKey.'
    );
  }

  if (provider === 'anthropic' && model.startsWith('gpt-')) {
    throw new Error(
      `Model "${model}" is an OpenAI model but provider is set to "anthropic". Update buglens.model (e.g. claude-sonnet-4-6).`
    );
  }
  if (provider === 'openai' && (model.startsWith('claude-') || model.startsWith('claude'))) {
    throw new Error(
      `Model "${model}" is an Anthropic model but provider is set to "openai". Update buglens.model (e.g. gpt-4o).`
    );
  }

  if (provider === 'openai') {
    const client = new OpenAI({ apiKey });
    const stream = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      stream: true,
    });
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? '';
      if (text) yield text;
    }
  } else if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey });
    const stream = (await client.messages.create({
      model,
      max_tokens: 2048,
      system,
      messages: [{ role: 'user', content: user }],
      stream: true,
    } as any)) as unknown as AsyncIterable<{ type: string; delta: { type: string; text?: string } }>;
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const text = event.delta.text ?? '';
        if (text) yield text;
      }
    }
  } else {
    throw new Error(
      `Unknown provider: "${provider}". Set buglens.provider to "openai" or "anthropic".`
    );
  }
}
