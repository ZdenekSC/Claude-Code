import Anthropic from '@anthropic-ai/sdk';
import { buildGameContext, buildQuestion, TIP_SYSTEM_PROMPT, TipContext, tipCacheKey } from '../core/tips';

export interface AiSettings {
  /** Claude model id. */
  model: string;
  /** Read on every request, so a key saved in Settings takes effect immediately. */
  getApiKey: () => string | undefined;
}

/** Turns a clicked champion into a short spoken tip using Claude. */
export class AiCoach {
  private client: Anthropic | null = null;
  private clientKey: string | undefined;
  private readonly cache = new Map<string, Promise<string>>();

  constructor(private readonly settings: AiSettings) {}

  private getClient(): Anthropic {
    const key = this.settings.getApiKey();
    if (!key) throw new Error(NO_KEY_MESSAGE);
    if (!this.client || key !== this.clientKey) {
      this.client = new Anthropic({ apiKey: key });
      this.clientKey = key;
    }
    return this.client;
  }

  /** Cheap check used by Settings: lists models, which costs nothing. */
  static async testKey(key: string): Promise<void> {
    try {
      await new Anthropic({ apiKey: key.trim() }).models.list({ limit: 1 });
    } catch (error) {
      throw new Error(describeError(error));
    }
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
      const response = await this.getClient().beta.messages.create({
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
      throw new Error(describeError(error));
    }
  }
}

const NO_KEY_MESSAGE = 'AI tips need an Anthropic API key: press Ctrl+Shift+S (or the tray icon → Settings) to add one.';

function describeError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return `That API key was rejected. ${NO_KEY_MESSAGE}`;
  if (error instanceof Anthropic.PermissionDeniedError) return 'This API key is not allowed to use the model; check your Anthropic Console.';
  if (error instanceof Anthropic.RateLimitError) return 'AI is rate limited (or out of credits). Try again in a moment, or check Billing in the Anthropic Console.';
  if (error instanceof Anthropic.APIConnectionError) return 'Could not reach the AI service. Check your internet connection.';
  if (error instanceof Anthropic.APIError) return `AI error ${error.status ?? ''}: ${error.message}`;
  return error instanceof Error ? error.message : String(error);
}
