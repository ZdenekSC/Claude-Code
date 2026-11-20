import { promises as fs } from 'fs';
import * as path from 'path';

/** Static champion data from Riot's Data Dragon (champion.json). */
export interface ChampionInfo {
  id: string; // Data Dragon id, e.g. "MonkeyKing"
  key: number; // numeric id used by the League client, e.g. 62
  name: string; // display name, e.g. "Wukong"
  tags: string[]; // e.g. ["Fighter", "Tank"]
  attack: number; // 0-10 rating
  magic: number; // 0-10 rating
  defense: number; // 0-10 rating
}

export interface DdragonChampionJson {
  version: string;
  data: Record<
    string,
    {
      id: string;
      key: string;
      name: string;
      tags: string[];
      info: { attack: number; defense: number; magic: number; difficulty: number };
    }
  >;
}

export class ChampionIndex {
  readonly byId = new Map<string, ChampionInfo>();
  readonly byKey = new Map<number, ChampionInfo>();
  private readonly byLowerName = new Map<string, ChampionInfo>();

  constructor(readonly version: string, champions: ChampionInfo[]) {
    for (const c of champions) {
      this.byId.set(c.id, c);
      this.byKey.set(c.key, c);
      this.byLowerName.set(c.id.toLowerCase(), c);
      this.byLowerName.set(c.name.toLowerCase(), c);
    }
  }

  /** Accepts a Data Dragon id ("MonkeyKing") or display name ("Wukong"), any case. */
  find(nameOrId: string): ChampionInfo | undefined {
    return this.byId.get(nameOrId) ?? this.byLowerName.get(nameOrId.toLowerCase());
  }

  /** Live Client API gives e.g. "game_character_displayname_MonkeyKing". */
  fromRawName(rawChampionName: string): ChampionInfo | undefined {
    return this.find(rawChampionName.replace(/^game_character_displayname_/, ''));
  }

  static fromDdragon(json: DdragonChampionJson): ChampionIndex {
    const champions = Object.values(json.data).map((c) => ({
      id: c.id,
      key: Number(c.key),
      name: c.name,
      tags: c.tags,
      attack: c.info.attack,
      magic: c.info.magic,
      defense: c.info.defense,
    }));
    return new ChampionIndex(json.version, champions);
  }
}

export function isMagicDamage(c: ChampionInfo): boolean {
  return c.magic > c.attack;
}

const DDRAGON = 'https://ddragon.leagueoflegends.com';

/** Downloads the latest champion.json, falling back to the on-disk cache when offline. */
export async function loadChampions(cacheDir: string): Promise<ChampionIndex> {
  const cacheFile = path.join(cacheDir, 'champion.json');
  try {
    const versions = (await (await fetch(`${DDRAGON}/api/versions.json`)).json()) as string[];
    const latest = versions[0];
    const res = await fetch(`${DDRAGON}/cdn/${latest}/data/en_US/champion.json`);
    if (!res.ok) throw new Error(`Data Dragon returned ${res.status}`);
    const json = (await res.json()) as DdragonChampionJson;
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(cacheFile, JSON.stringify(json));
    return ChampionIndex.fromDdragon(json);
  } catch (err) {
    const cached = await fs.readFile(cacheFile, 'utf8').catch(() => null);
    if (!cached) throw err;
    return ChampionIndex.fromDdragon(JSON.parse(cached) as DdragonChampionJson);
  }
}

/** A champion's abilities, used to ground AI tips in the real kit. */
export interface ChampionKit {
  passive: { name: string; description: string };
  spells: Array<{ key: Skill; name: string; description: string; cooldown: string }>;
}

interface DdragonChampionDetailJson {
  data: Record<
    string,
    {
      passive: { name: string; description: string };
      spells: Array<{ name: string; description: string; cooldownBurn: string }>;
    }
  >;
}

/** Data Dragon descriptions contain HTML-like markup (<br>, <status>, ...). */
export function stripMarkup(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseKit(json: DdragonChampionDetailJson, id: string): ChampionKit | null {
  const c = json.data[id];
  if (!c) return null;
  const keys: Skill[] = ['Q', 'W', 'E', 'R'];
  return {
    passive: { name: c.passive.name, description: stripMarkup(c.passive.description) },
    spells: c.spells.slice(0, 4).map((s, i) => ({
      key: keys[i],
      name: s.name,
      description: stripMarkup(s.description),
      cooldown: s.cooldownBurn,
    })),
  };
}

/** Downloads (and caches on disk) one champion's ability descriptions. */
export async function loadChampionKit(version: string, id: string, cacheDir: string): Promise<ChampionKit | null> {
  const cacheFile = path.join(cacheDir, 'kits', `${version}-${id}.json`);
  let raw = await fs.readFile(cacheFile, 'utf8').catch(() => null);
  if (!raw) {
    try {
      const res = await fetch(`${DDRAGON}/cdn/${version}/data/en_US/champion/${id}.json`);
      if (!res.ok) return null;
      raw = await res.text();
      await fs.mkdir(path.dirname(cacheFile), { recursive: true });
      await fs.writeFile(cacheFile, raw);
    } catch {
      return null;
    }
  }
  return parseKit(JSON.parse(raw) as DdragonChampionDetailJson, id);
}

export function championIconUrl(version: string, id: string): string {
  return `${DDRAGON}/cdn/${version}/img/champion/${id}.png`;
}
