# League Coach

A Windows overlay for League of Legends that:

- **Champion select:** suggests bans and picks from your own champion pool, with reasons (counters, team damage balance, missing frontline).
- **In game:** shows objective timers (Dragon / Elder, Voidgrubs, Rift Herald, Atakhan, Baron) with voice callouts one minute before a spawn and when it spawns.
- **In game:** reminds you which item categories fit the enemy team (magic resist vs armor, anti-heal, penetration).
- **In game:** suggests which skill to level next, using a common max order for your champion.
- **AI tips (champ select and in game):** click any teammate or enemy portrait in the overlay to get a short spoken tip, for example *"Careful, Leona's E roots you, then she can stun you with Q"* or *"Thresh is an engage support, so stay close behind him and avoid shoving."*

## Requirements

- Windows 10/11 and Node.js 20+
- League must run in **Borderless** mode (Settings → Video → Window Mode). Overlays can't draw over exclusive fullscreen.

## Run

```bash
cd league-coach
npm install
npm start
```

| Hotkey | Action |
|---|---|
| `Ctrl+Shift+L` | Show / hide the overlay |
| `Ctrl+Shift+Q` | Quit |

On first run the app creates `%APPDATA%\league-coach\config.json` from `config.example.json`. Fill in your champion pool and ban list per role (`top`, `jungle`, `middle`, `bottom`, `utility`). Data Dragon ids (`MonkeyKing`) and display names (`Wukong`) both work.

### AI tips setup

Tips use Claude through the Anthropic API, so you need an API key from console.anthropic.com. Either:

- set the `ANTHROPIC_API_KEY` environment variable (recommended), or
- put it in `config.json` under `"ai": { "apiKey": "..." }`. That file is stored as plain text in your user folder.

`"ai": { "model": ... }` defaults to `claude-opus-5-5` (about half a cent per tip). Set it to `claude-haiku-5-5` for roughly 1/40th of the cost. `"ai": { "enabled": false }` turns tips off.

How tips are made:
- The prompt includes the clicked champion's **real ability descriptions from Data Dragon**, both teams, your champion and role, and the game minute. The AI is told to describe only abilities from that list, so it doesn't invent a stun that doesn't exist.
- Each tip is cached per matchup for the current game: clicking the same champion again is instant and free.
- If the model declines a request, the API retries on a fallback model within the same call (`fallbacks: "default"`).
- The overlay ignores the mouse except while the pointer is over the panel. Clicking a portrait doesn't take focus away from League.

### Try the overlay without a game

```bash
npm run mock         # fake game on port 2999 (SPEED=10 START=240 by default)
npm run start:mock   # in a second terminal
```

### Tests and installer

```bash
npm test             # unit tests for the coaching logic
npm run dist         # builds a Windows installer in dist/ (electron-builder)
```

## How it works

| Source | Used for |
|---|---|
| League Client API (LCU): local WebSocket, credentials taken from the client process or its `lockfile` | Champion-select session: picks, bans, hovers, your role |
| Live Client Data API (`https://127.0.0.1:2999`, only during a game) | Game time, objective kill events, your level and ability ranks, both teams' champions |
| Data Dragon (`ddragon.leagueoflegends.com`) | Champion names, ids, tags, damage ratings, ability descriptions and portraits. Cached for offline use. |
| Anthropic API (Claude) | AI tips when you click a champion |

```
src/core/       coaching logic (pure, unit-tested)
  draft.ts        pick and ban scoring
  objectives.ts   spawn timers and voice callouts  <- update OBJECTIVE_TIMINGS when Riot changes them
  builds.ts       item-category reminders
  skills.ts       skill level-up suggestions
  tips.ts         AI tip prompt (system prompt + matchup + ability text)
src/data/       counters.json, skill-orders.json (small examples, extend them)
src/main/       Electron main process, LCU and Live Client connections, aiCoach.ts (Claude API)
src/renderer/   overlay script; static/ holds its HTML and CSS
scripts/        mock Live Client server
```

Voice uses the Windows built-in speech engine, so it's free and offline. You can swap in a neural TTS model later in `src/renderer/overlay.ts` (`onSpeak`).

## Riot policy notes

The design follows Riot's third-party app rules as publicly reported (verify on the [developer portal](https://developer.riotgames.com/policies/general) before distributing):

- Uses only official local APIs. It **never reads game memory** (Riot blocks unknown memory access from Oct 6, 2026) and **never sends input** to the game.
- Shows only information already available in the game client: epic-monster kills are announced to everyone. **Do not add** enemy ultimate or summoner cooldown timers; Riot banned enemy ultimate timers on March 13, 2025.
- Advice is phrased as suggestions with options ("highlight decisions, don't make them"), not commands.
- The League Client API is not officially supported by Riot, so endpoints may change without notice.
- To distribute publicly, register the product on the Riot developer portal.

## Known gaps / next steps

- `counters.json` and `skill-orders.json` hold only examples. Fill them in, or generate them from match data.
- Spawn timings in `objectives.ts` must be checked each season.
- Event names for Voidgrubs and Atakhan kills (`HordeKill`, `AtakhanKill`) are unverified. Until confirmed, those timers hide 4 minutes after spawning.
- AI tips can be wrong. They're grounded in Data Dragon ability text, but they can still misjudge a matchup.
- Voice is the Windows built-in engine. A neural TTS (e.g. Kokoro, run locally) would sound much better for AI tips.
