import { describe, expect, it } from 'vitest';
import { parseKit, stripMarkup } from './champions';
import { buildTipPrompt, TipContext, tipCacheKey } from './tips';

const ddragonDetail = {
  data: {
    Leona: {
      passive: { name: 'Sunlight', description: 'Damaging spells mark enemies.<br>Allies deal bonus damage.' },
      spells: [
        { name: 'Shield of Daybreak', description: 'Next attack <status>Stuns</status> the target.', cooldownBurn: '5' },
        { name: 'Eclipse', description: 'Gains resistances.', cooldownBurn: '14/13/12/11/10' },
        { name: 'Zenith Blade', description: 'Dashes to the first enemy champion hit, <status>Rooting</status> it.', cooldownBurn: '12/11/10/9/8' },
        { name: 'Solar Flare', description: 'Stuns enemies in the center and slows the rest.', cooldownBurn: '90/75/60' },
      ],
    },
  },
};

describe('champion kits', () => {
  it('strips Data Dragon markup', () => {
    expect(stripMarkup('A<br>B <status>Stun</status>  C')).toBe('A B Stun C');
  });

  it('parses passive and Q/W/E/R', () => {
    const kit = parseKit(ddragonDetail, 'Leona')!;
    expect(kit.passive.description).toBe('Damaging spells mark enemies. Allies deal bonus damage.');
    expect(kit.spells.map((s) => `${s.key}:${s.name}`)).toEqual([
      'Q:Shield of Daybreak',
      'W:Eclipse',
      'E:Zenith Blade',
      'R:Solar Flare',
    ]);
    expect(kit.spells[0].description).toBe('Next attack Stuns the target.');
    expect(parseKit(ddragonDetail, 'Ahri')).toBeNull();
  });
});

describe('tip prompt', () => {
  const ctx: TipContext = {
    phase: 'inGame',
    me: { champion: 'Jinx', role: 'bottom' },
    target: { champion: 'Leona', relation: 'enemy', role: 'utility', kit: parseKit(ddragonDetail, 'Leona') },
    allies: ['Jinx', 'Thresh'],
    enemies: ['Leona', 'Caitlyn'],
    gameTime: 425,
  };

  it('includes the matchup, game time and the real kit', () => {
    const prompt = buildTipPrompt(ctx);
    expect(prompt).toContain('In game at 7 minutes.');
    expect(prompt).toContain('I am playing: Jinx (bottom).');
    expect(prompt).toContain('Give me a tip about the enemy Leona (utility).');
    expect(prompt).toContain('E — Zenith Blade (cooldown 12/11/10/9/8s): Dashes to the first enemy champion hit, Rooting it.');
  });

  it('handles champion select without a pick or kit', () => {
    const prompt = buildTipPrompt({
      ...ctx,
      phase: 'champSelect',
      me: { champion: null, role: 'bottom' },
      target: { champion: 'Thresh', relation: 'ally', kit: null },
    });
    expect(prompt).toContain('Champion select.');
    expect(prompt).toContain('I am playing: not picked yet, role bottom.');
    expect(prompt).toContain('my teammate Thresh');
    expect(prompt).not.toContain('abilities:');
  });

  it('caches per matchup, not per game minute', () => {
    expect(tipCacheKey(ctx)).toBe(tipCacheKey({ ...ctx, gameTime: 900 }));
    expect(tipCacheKey(ctx)).not.toBe(tipCacheKey({ ...ctx, me: { champion: 'Ezreal', role: 'bottom' } }));
  });
});
