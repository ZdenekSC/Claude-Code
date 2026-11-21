import { describe, expect, it } from 'vitest';
import { parseItemCatalog, parseKit, stripMarkup } from './champions';
import { buildGameContext, buildQuestion, isLaneOpponent, TipChampion, TipContext, tipCacheKey } from './tips';

const kitJson = (id: string, q: string, qcd: string) => ({
  data: {
    [id]: {
      passive: { name: `${id} passive`, description: 'Passive.<br>Text.' },
      spells: [
        { name: q, description: 'Q <status>does</status> things.', cooldownBurn: qcd },
        { name: 'W', description: 'W.', cooldownBurn: '10' },
        { name: 'E', description: 'E.', cooldownBurn: '10' },
        { name: 'R', description: 'R.', cooldownBurn: '100' },
      ],
    },
  },
});

describe('champion kits', () => {
  it('strips Data Dragon markup', () => {
    expect(stripMarkup('A<br>B <status>Stun</status>  C')).toBe('A B Stun C');
  });

  it('parses passive and Q/W/E/R', () => {
    const kit = parseKit(kitJson('Darius', 'Decimate', '9/8/7/6/5'), 'Darius')!;
    expect(kit.passive.description).toBe('Passive. Text.');
    expect(kit.spells.map((s) => s.key)).toEqual(['Q', 'W', 'E', 'R']);
    expect(kit.spells[0]).toEqual({ key: 'Q', name: 'Decimate', description: 'Q does things.', cooldown: '9/8/7/6/5' });
    expect(parseKit(kitJson('Darius', 'x', '1'), 'Ahri')).toBeNull();
  });
});

describe('item catalog', () => {
  const item = (name: string, total: number, extra: object = {}) => ({ name, tags: ['Damage'], gold: { total, purchasable: true }, maps: { '11': true }, ...extra });
  it('keeps finished Rift items and upgraded boots only', () => {
    const catalog = parseItemCatalog({
      data: {
        '1': item('Long Sword', 350, { into: ['2'] }),
        '2': item('Infinity Edge', 3400),
        '3': item('Infinity Edge', 3400), // duplicate id variant
        '4': item("Plated Steelcaps", 1200, { tags: ['Boots', 'Armor'] }),
        '5': item('Arena Only', 3000, { maps: { '11': false } }),
        '6': item('Ornn Upgrade', 3500, { requiredAlly: 'Ornn' }),
        '7': item('Health Potion', 50, { consumed: true }),
      },
    });
    expect(catalog.map((i) => i.name)).toEqual(['Infinity Edge', 'Plated Steelcaps']);
  });
});

describe('lane opponents', () => {
  const c = (name: string, relation: TipChampion['relation'], role: Lane | null): TipChampion => ({ name, relation, role, kit: null });
  it('matches solo lanes by role and bot lane as a 2v2', () => {
    expect(isLaneOpponent(c('Garen', 'me', 'top'), c('Darius', 'enemy', 'top'))).toBe(true);
    expect(isLaneOpponent(c('Garen', 'me', 'top'), c('Zed', 'enemy', 'middle'))).toBe(false);
    expect(isLaneOpponent(c('Jinx', 'me', 'bottom'), c('Leona', 'enemy', 'utility'))).toBe(true);
    expect(isLaneOpponent(c('Thresh', 'me', 'utility'), c('Caitlyn', 'enemy', 'bottom'))).toBe(true);
    expect(isLaneOpponent(c('Jinx', 'me', 'bottom'), c('Thresh', 'ally', 'utility'))).toBe(false);
    expect(isLaneOpponent(c('Jinx', 'me', null), c('Leona', 'enemy', 'utility'))).toBe(false);
  });
});

describe('tip prompt', () => {
  const darius = parseKit(kitJson('Darius', 'Decimate', '9/8/7/6/5'), 'Darius');
  const ctx: TipContext = {
    phase: 'inGame',
    gameTime: 425,
    myGold: 1350.6,
    target: 'Darius',
    itemCatalog: [{ name: 'Bramble Vest', tags: ['Armor'], gold: 800 }, { name: 'Thornmail', tags: ['Armor', 'Health'], gold: 2450 }],
    champions: [
      { name: 'Garen', relation: 'me', role: 'top', kit: null, level: 6, kda: '1/0/0', items: ['Doran’s Blade'] },
      { name: 'Thresh', relation: 'ally', role: 'utility', kit: null, level: 5, kda: '0/0/1', items: [] },
      { name: 'Darius', relation: 'enemy', role: 'top', kit: darius, level: 6, kda: '0/1/0', items: ['Long Sword'] },
      { name: 'Soraka', relation: 'enemy', role: 'utility', kit: null, level: 5, kda: '0/0/0', items: [] },
    ],
  };

  it('puts all champions, kits, lane opponent and items in the cached context', () => {
    const text = buildGameContext(ctx);
    expect(text).toMatch(/MY TEAM:\nGaren \(top\) — THIS IS ME/);
    expect(text).toContain('Darius (top) — MY LANE OPPONENT');
    expect(text).toContain('Q Decimate (cd 9/8/7/6/5s): Q does things.');
    expect(text).not.toContain('Soraka (utility) — MY LANE OPPONENT');
    expect(text).toContain('ITEMS AVAILABLE (name [tags]):\nBramble Vest [Armor]; Thornmail [Armor, Health]');
    // Nothing that changes during the game may be in the cached part.
    expect(text).not.toMatch(/level|gold|minutes/i);
  });

  it('asks about the lane for the lane opponent, with live state', () => {
    const q = buildQuestion(ctx);
    expect(q).toContain('Phase: in game, 7 minutes in.');
    expect(q).toContain('My current gold: 1350.');
    expect(q).toContain('- Darius (top) [enemy]: level 6, 0/1/0, items: Long Sword');
    expect(q).toContain('- Thresh (utility) [ally]: level 5, 0/0/1, items: none');
    expect(q).toContain('I clicked my lane opponent Darius (top). How do I play this lane right now?');
    expect(buildQuestion({ ...ctx, target: 'Soraka' })).toContain('I clicked the enemy Soraka (utility).');
    expect(buildQuestion({ ...ctx, target: 'Thresh' })).toContain('I clicked my teammate Thresh (utility).');
    expect(buildQuestion({ ...ctx, target: 'Garen' })).toContain('I clicked my own champion, Garen.');
  });

  it('has no game state in champion select', () => {
    const q = buildQuestion({ ...ctx, phase: 'champSelect' });
    expect(q).toContain('Phase: champion select.');
    expect(q).not.toContain('gold');
  });

  it('re-asks after anyone buys an item, otherwise reuses the tip', () => {
    expect(tipCacheKey(ctx)).toBe(tipCacheKey({ ...ctx, gameTime: 500, myGold: 10 }));
    const bought = { ...ctx, champions: ctx.champions.map((c) => (c.name === 'Darius' ? { ...c, items: ['Long Sword', 'Cloth Armor'] } : c)) };
    expect(tipCacheKey(ctx)).not.toBe(tipCacheKey(bought));
  });
});

describe('draft prompt', () => {
  it('lists pool with evidence, nemeses, picks and bans', async () => {
    const { buildDraftPrompt } = await import('./tips');
    const text = buildDraftPrompt({
      stage: 'pick',
      role: 'middle',
      myPool: [{ name: 'Ahri', reason: '8 recent games, 75% wins' }],
      nemeses: [{ name: 'Yasuo', reason: 'Beat you 3 of 3 times in lane' }],
      allies: [{ name: 'Garen', role: 'top' }],
      enemies: ['Zed'],
      banned: [],
    });
    expect(text).toContain('Stage: my pick is now.');
    expect(text).toContain('My champion pool: Ahri (8 recent games, 75% wins).');
    expect(text).toContain('Lane opponents who beat me most: Yasuo (Beat you 3 of 3 times in lane).');
    expect(text).toContain('My team so far: Garen (top).');
    expect(text).toContain('Enemy team so far: Zed.');
    expect(text).toContain('Banned: none yet.');
  });
});
