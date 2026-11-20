import type { ChampionKit } from './champions';

/** Everything the AI needs to give a tip about one champion. */
export interface TipContext {
  phase: 'champSelect' | 'inGame';
  me: { champion: string | null; role: Lane | null };
  target: { champion: string; relation: 'ally' | 'enemy'; role?: Lane | null; kit: ChampionKit | null };
  allies: string[];
  enemies: string[];
  gameTime?: number; // seconds, in game only
}

export const TIP_SYSTEM_PROMPT = `You are a League of Legends coach speaking to a player through a small voice overlay during champion select or a live game.

When the player asks about a champion, give the most useful practical advice for that moment:
- For an enemy: their main threats to the player (crowd control, burst, engage tools, power spikes) and how to play around them.
- For an ally: how to play with them (e.g. an engage support wants you close behind them; a poke support wants you to avoid long fights; a scaling ally wants a slow game).

Rules:
- At most 2 short sentences, under 40 words total. It will be read aloud, so plain spoken English: no markdown, lists, or emoji.
- Name abilities by their key (Q, W, E, R) and name, and only describe abilities from the kit provided. If no kit is provided, keep the advice general rather than guessing specifics.
- Phrase advice as suggestions, not commands.`;

function formatKit(kit: ChampionKit): string {
  const lines = [`Passive — ${kit.passive.name}: ${kit.passive.description}`];
  for (const s of kit.spells) lines.push(`${s.key} — ${s.name} (cooldown ${s.cooldown}s): ${s.description}`);
  return lines.join('\n');
}

export function buildTipPrompt(ctx: TipContext): string {
  const me = ctx.me.champion ? `${ctx.me.champion}${ctx.me.role ? ` (${ctx.me.role})` : ''}` : `not picked yet${ctx.me.role ? `, role ${ctx.me.role}` : ''}`;
  const when =
    ctx.phase === 'champSelect'
      ? 'Champion select'
      : `In game at ${Math.floor((ctx.gameTime ?? 0) / 60)} minutes`;
  const parts = [
    `${when}.`,
    `I am playing: ${me}.`,
    `My team: ${ctx.allies.join(', ') || 'unknown'}.`,
    `Enemy team: ${ctx.enemies.join(', ') || 'unknown'}.`,
    '',
    `Give me a tip about ${ctx.target.relation === 'enemy' ? 'the enemy' : 'my teammate'} ${ctx.target.champion}${ctx.target.role ? ` (${ctx.target.role})` : ''}.`,
  ];
  if (ctx.target.kit) parts.push('', `${ctx.target.champion}'s abilities:`, formatKit(ctx.target.kit));
  return parts.join('\n');
}

/** Tips are cached per game for the same matchup, so repeat clicks are instant and free. */
export function tipCacheKey(ctx: TipContext): string {
  return [ctx.phase, ctx.me.champion ?? '-', ctx.target.relation, ctx.target.champion].join('|');
}
