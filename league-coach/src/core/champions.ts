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
