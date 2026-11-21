import type { CatalogItem, ChampionKit } from './champions';

/** One of the (up to) ten champions in the game, as the AI sees it. */
export interface TipChampion {
  name: string;
  relation: 'me' | 'ally' | 'enemy';
  role: Lane | null;
  kit: ChampionKit | null;
  /** In game only. */
  level?: number;
  kda?: string; // "3/1/4"
  items?: string[];
}

/** Everything the AI needs to give a tip about one champion. */
export interface TipContext {
  phase: 'champSelect' | 'inGame';
  gameTime?: number; // seconds, in game only
  myGold?: number; // in game only
  champions: TipChampion[];
  /** Name of the clicked champion (may be the player's own). */
  target: string;
  itemCatalog: CatalogItem[];
}

export const TIP_SYSTEM_PROMPT = `You are a League of Legends coach speaking to a player through a small voice overlay during champion select or a live game.

You get the full game: every champion with their abilities and cooldowns, and in game their level, score and items. When the player clicks a champion, give the most useful advice for that moment, thinking about all ten champions, not just the clicked one:
- Lane opponent clicked (marked MY LANE OPPONENT), during laning (champion select or the first ~14 minutes): how to play the lane. Name the trading window tied to their key ability's cooldown (e.g. "trade when Darius's Q, Decimate, is on cooldown, it's his main damage and heal"), which ability to dodge or bait, when they spike (level 2, 3, 6, a key item), and who wins all-ins.
- Other enemy clicked: their main threat to the player and how it combines with their teammates (e.g. a Malphite engage that sets up a Yasuo ultimate), and how to play around it. Mention jungle gank threat if relevant.
- Ally clicked: the synergy between that ally and the player (e.g. an engage support wants you close behind and won't want you to shove; follow up on their crowd control), and the lane or teamfight plan that suits them.
- Player's own champion clicked: during laning, the lane plan against the lane opponent(s); later, the game plan: win condition, who to focus or avoid.
- After laning, shift to teamfights, objectives and positioning.
- In game, finish with one concrete next item for the player that fits the whole enemy team and what they are building (e.g. magic resist into a magic-heavy team, anti-heal into healers), with a few words on why. In champion select, name one item to plan around instead.

Rules:
- At most 3 short sentences, under 50 words total. It is read aloud: plain spoken English, no markdown, lists, or emoji.
- Base cooldown-timing advice on the listed cooldowns (they are per rank).
- Refer to abilities by key and name (e.g. "her E, Zenith Blade") and only describe abilities listed in the kits. If a kit is missing, keep that champion's advice general.
- Only recommend items from the provided item list, by exact name.
- Phrase advice as suggestions, not commands.`;

const KIT_DESCRIPTION_LIMIT = 220;

function clip(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`;
}

function formatKit(kit: ChampionKit): string {
  const lines = [`  Passive ${kit.passive.name}: ${clip(kit.passive.description, KIT_DESCRIPTION_LIMIT)}`];
  for (const s of kit.spells) {
    lines.push(`  ${s.key} ${s.name} (cd ${s.cooldown}s): ${clip(s.description, KIT_DESCRIPTION_LIMIT)}`);
  }
  return lines.join('\n');
}

/** Enemies who share the player's lane. Bot lane is a 2v2: bottom and utility face both. */
export function isLaneOpponent(me: TipChampion | undefined, c: TipChampion): boolean {
  if (!me?.role || !c.role || c.relation !== 'enemy') return false;
  const botLane: Lane[] = ['bottom', 'utility'];
  if (botLane.includes(me.role)) return botLane.includes(c.role);
  return me.role === c.role;
}

function label(c: TipChampion): string {
  return `${c.name}${c.role ? ` (${c.role})` : ''}`;
}

const GROUPS: Array<[TipChampion['relation'][], string]> = [
  [['me', 'ally'], 'MY TEAM'],
  [['enemy'], 'ENEMY TEAM'],
];

/**
 * The part of the prompt that stays the same for a whole game (champions, kits, item list).
 * Sent first and marked for prompt caching, so repeat clicks only pay for the small changing part.
 */
export function buildGameContext(ctx: TipContext): string {
  const me = ctx.champions.find((c) => c.relation === 'me');
  const parts: string[] = [];
  for (const [relations, title] of GROUPS) {
    const team = ctx.champions.filter((c) => relations.includes(c.relation));
    parts.push(`${title}:`);
    if (!team.length) parts.push('  (not picked yet)');
    for (const c of team) {
      const marker = c.relation === 'me' ? ' — THIS IS ME' : isLaneOpponent(me, c) ? ' — MY LANE OPPONENT' : '';
      parts.push(`${label(c)}${marker}`);
      parts.push(c.kit ? formatKit(c.kit) : '  (abilities unknown)');
    }
    parts.push('');
  }
  if (ctx.itemCatalog.length) {
    parts.push('ITEMS AVAILABLE (name [tags]):');
    parts.push(ctx.itemCatalog.map((i) => `${i.name} [${i.tags.join(', ')}]`).join('; '));
  }
  return parts.join('\n').trim();
}

/** The part that changes between clicks: game state and the question. */
export function buildQuestion(ctx: TipContext): string {
  const parts: string[] = [];
  if (ctx.phase === 'champSelect') {
    parts.push('Phase: champion select.');
  } else {
    parts.push(`Phase: in game, ${Math.floor((ctx.gameTime ?? 0) / 60)} minutes in.`);
    if (ctx.myGold !== undefined) parts.push(`My current gold: ${Math.floor(ctx.myGold)}.`);
    parts.push('Current state (level, kills/deaths/assists, items):');
    for (const c of ctx.champions) {
      const side = c.relation === 'enemy' ? 'enemy' : c.relation === 'me' ? 'me' : 'ally';
      parts.push(`- ${label(c)} [${side}]: level ${c.level ?? '?'}, ${c.kda ?? '?'}, items: ${c.items?.length ? c.items.join(', ') : 'none'}`);
    }
  }
  const target = ctx.champions.find((c) => c.name === ctx.target);
  const me = ctx.champions.find((c) => c.relation === 'me');
  parts.push('');
  if (target?.relation === 'me') parts.push(`I clicked my own champion, ${ctx.target}. What is my plan right now?`);
  else if (target && isLaneOpponent(me, target)) parts.push(`I clicked my lane opponent ${label(target)}. How do I play this lane right now?`);
  else if (target?.relation === 'enemy') parts.push(`I clicked the enemy ${label(target)}. What should I know?`);
  else parts.push(`I clicked my teammate ${target ? label(target) : ctx.target}. How do I play with them?`);
  return parts.join('\n');
}

/**
 * Tips are cached for the same click until the situation changes: a new pick in champ select,
 * or an item bought by anyone in game. Repeat clicks in between are instant and free.
 */
export function tipCacheKey(ctx: TipContext): string {
  const state = ctx.champions.map((c) => `${c.name}:${(c.items ?? []).join('+')}`).join(',');
  return [ctx.phase, ctx.target, state].join('|');
}

/** Champion select: what the AI sees for one draft suggestion. */
export interface DraftContext {
  stage: 'ban' | 'pick';
  role: Lane | null;
  /** The player's own champions with evidence, best first (from match history / mastery). */
  myPool: Array<{ name: string; reason: string }>;
  /** Lane opponents who beat the player most often. */
  nemeses: Array<{ name: string; reason: string }>;
  allies: Array<{ name: string; role: Lane | null }>;
  enemies: string[];
  banned: string[];
}

export const DRAFT_SYSTEM_PROMPT = `You are a League of Legends draft coach speaking to a player through a voice overlay during champion select.

Ban stage: suggest one ban, preferring a strong lane opponent for their role, especially one listed as beating them often, and say why in a few words. Then name the pick from their pool you'd plan around.
Pick stage: suggest the best pick from their own pool given both teams' picks (counters to their likely lane opponent, team damage mix, frontline, synergy with allies), with a short reason, and one backup.

Rules:
- Prefer champions from the player's pool; suggest a champion outside it only if nothing in the pool fits, and say so.
- Never suggest a champion that is banned or already picked.
- At most 2 short sentences, under 40 words. Read aloud: plain spoken English, no markdown or lists.`;

export function buildDraftPrompt(ctx: DraftContext): string {
  const list = (items: Array<{ name: string; reason: string }>) =>
    items.length ? items.map((i) => `${i.name} (${i.reason})`).join('; ') : 'none known';
  return [
    `Stage: ${ctx.stage === 'ban' ? 'ban phase' : 'my pick is now'}.`,
    `My role: ${ctx.role ?? 'unknown (blind pick)'}.`,
    `My champion pool: ${list(ctx.myPool)}.`,
    `Lane opponents who beat me most: ${list(ctx.nemeses)}.`,
    `My team so far: ${ctx.allies.map((a) => `${a.name}${a.role ? ` (${a.role})` : ''}`).join(', ') || 'nobody locked in'}.`,
    `Enemy team so far: ${ctx.enemies.join(', ') || 'nobody locked in'}.`,
    `Banned: ${ctx.banned.join(', ') || 'none yet'}.`,
  ].join('\n');
}
