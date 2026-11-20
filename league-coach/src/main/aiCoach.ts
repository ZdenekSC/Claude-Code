import Anthropic from '@anthropic-ai/sdk';
import { buildGameContext, buildQuestion, TIP_SYSTEM_PROMPT, TipContext, tipCacheKey } from '../core/tips';

export interface AiSettings {
  /** Claude model id. */
  model: string;
  /** Optional; otherwise ANTHROPIC_API_KEY (or an `ant auth login` profile) is used. */
  apiKey?: string;
}

/** Turns a clicked champion into a short spoken tip using Claude. */
export class AiCoach {
  private readonly client: Anthropic;
  private readonly cache = new Map<string, Promise<string>>();

  constructor(private readonly settings: AiSettings) {
    this.client = new Anthropic(settings.apiKey ? { apiKey: settings.apiKey } : {});
  }

  /** Call when a new game or champion select starts. */
  resetCache(): void {
    this.cache.clear();
  }

  tip(ctx: TipContext): Promise<string> {
    const key = tipCacheKey(ctx);
    let pending = this.cache.get(key);
    if (!pending) {
      pending = this.request(ctx);
      this.cache.set(key, pending);
      pending.catch(() => this.cache.delete(key)); // don't cache failures
    }
    return pending;
  }

  private async request(ctx: TipContext): Promise<string> {
    try {
      const response = await this.client.beta.messages.create({
        model: this.settings.model,
        max_tokens: 4000,
        // Short factual tips: low effort keeps them fast and cheap.
        output_config: { effort: 'low' },
        // If the model declines, the API retries on a fallback model in the same call.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: TIP_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              // Same for every click in a game (all kits + item list): cached, so repeat clicks cost far less.
              { type: 'text', text: buildGameContext(ctx), cache_control: { type: 'ephemeral' } },
              { type: 'text', text: buildQuestion(ctx) },
            ],
          },
        ],
      });
      if (response.stop_reason === 'refusal') return `No tip available for ${ctx.target} right now.`;
      const text = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join(' ')
        .trim();
      if (!text) throw new Error('Empty response');
      return text;
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        throw new Error('AI tips need an Anthropic API key: set ANTHROPIC_API_KEY or "ai.apiKey" in config.json.');
      }
      if (error instanceof Anthropic.RateLimitError) throw new Error('AI is rate limited — try again in a moment.');
      if (error instanceof Anthropic.APIConnectionError) throw new Error('Could not reach the AI service — check your connection.');
      if (error instanceof Anthropic.APIError) throw new Error(`AI error ${error.status ?? ''}: ${error.message}`);
      throw error;
    }
  }
}
