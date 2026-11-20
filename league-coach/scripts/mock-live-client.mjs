// Fake Live Client Data API so the overlay can be tested without being in a game.
// Usage: npm run mock   (then in another terminal: npm run start:mock)
// SPEED=10 makes game time run 10x faster; START=240 starts the clock at 4:00.
import http from 'node:http';

const SPEED = Number(process.env.SPEED ?? 10);
const START = Number(process.env.START ?? 240);
const started = Date.now();
const gameTime = () => START + ((Date.now() - started) / 1000) * SPEED;

const players = [
  ['Me#EUW', 'Ahri', 'ORDER'],
  ['Ally1#EUW', 'Garen', 'ORDER'],
  ['Ally2#EUW', 'LeeSin', 'ORDER'],
  ['Ally3#EUW', 'Jinx', 'ORDER'],
  ['Ally4#EUW', 'Thresh', 'ORDER'],
  ['Enemy1#EUW', 'Malphite', 'CHAOS'],
  ['Enemy2#EUW', 'Soraka', 'CHAOS'],
  ['Enemy3#EUW', 'Syndra', 'CHAOS'],
  ['Enemy4#EUW', 'Zed', 'CHAOS'],
  ['Enemy5#EUW', 'Sejuani', 'CHAOS'],
].map(([riotId, id, team]) => ({
  riotId,
  summonerName: riotId.split('#')[0],
  championName: id,
  rawChampionName: `game_character_displayname_${id}`,
  team,
}));

// Scripted events: a dragon is taken at 6:10, so the next one is due at 11:10.
const scripted = [
  { EventID: 0, EventName: 'GameStart', EventTime: 0 },
  { EventID: 1, EventName: 'DragonKill', EventTime: 370, DragonType: 'Fire', KillerName: 'Ally2' },
];

function level(t) {
  return Math.min(18, 1 + Math.floor(t / 60));
}

http
  .createServer((req, res) => {
    if (req.url !== '/liveclientdata/allgamedata') {
      res.writeHead(404).end();
      return;
    }
    const t = gameTime();
    const lvl = level(t);
    // Pretend the player has learned everything except the latest level's point.
    const spent = Math.max(0, lvl - 1);
    const r = spent >= 16 ? 3 : spent >= 11 ? 2 : spent >= 6 ? 1 : 0;
    const rest = spent - r;
    const q = Math.min(5, Math.ceil(rest / 2));
    const e = Math.min(5, Math.floor((rest - q) / 2));
    const w = rest - q - e;
    const body = {
      activePlayer: {
        riotId: 'Me#EUW',
        level: lvl,
        abilities: { Q: { abilityLevel: q }, W: { abilityLevel: w }, E: { abilityLevel: e }, R: { abilityLevel: r } },
      },
      allPlayers: players,
      events: { Events: scripted.filter((ev) => ev.EventTime <= t) },
      gameData: { gameTime: t, gameMode: 'CLASSIC' },
    };
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
  })
  .listen(2999, '127.0.0.1', () => {
    console.log(`Mock Live Client API on http://127.0.0.1:2999 (game starts at ${START}s, ${SPEED}x speed)`);
  });
