import * as http from 'http';
import * as https from 'https';
import type { LiveEvent } from '../core/objectives';

/** Subset of GET /liveclientdata/allgamedata (Live Client Data API, only available during a game). */
export interface LiveGameData {
  activePlayer: {
    riotId?: string;
    summonerName?: string;
    level: number;
    abilities: Partial<Record<Skill, { abilityLevel: number }>>;
  };
  allPlayers: Array<{
    riotId?: string;
    summonerName?: string;
    championName: string;
    rawChampionName: string;
    team: 'ORDER' | 'CHAOS';
  }>;
  events: { Events: LiveEvent[] };
  gameData: { gameTime: number; gameMode: string };
}

const BASE_URL = process.env.LIVE_CLIENT_URL ?? 'https://127.0.0.1:2999';
// The game serves a self-signed certificate on 127.0.0.1 only.
const localAgent = new https.Agent({ rejectUnauthorized: false });

export function fetchGameData(timeoutMs = 1500): Promise<LiveGameData | null> {
  const url = new URL('/liveclientdata/allgamedata', BASE_URL);
  const client = url.protocol === 'https:' ? https : http;
  return new Promise((resolve) => {
    const req = client.get(url, url.protocol === 'https:' ? { agent: localAgent } : {}, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return resolve(null);
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const data = JSON.parse(body) as LiveGameData;
          // While loading, the API can answer before players exist.
          resolve(data.allPlayers?.length ? data : null);
        } catch {
          resolve(null);
        }
      });
    });
    req.setTimeout(timeoutMs, () => req.destroy());
    req.on('error', () => resolve(null));
  });
}
