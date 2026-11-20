# League Coach

A Windows overlay for League of Legends that:

- **Champion select:** suggests bans and picks from your own champion pool, with reasons (counters, team damage balance, missing frontline).
- **In game:** shows objective timers (Dragon / Elder, Voidgrubs, Rift Herald, Atakhan, Baron) with voice callouts one minute before a spawn and when it spawns.
- **In game:** reminds you which item categories fit the enemy team (magic resist vs armor, anti-heal, penetration).
- **In game:** suggests which skill to level next, using a common max order for your champion.
- **AI tips (champ select and in game):** click any portrait in the overlay for a short spoken tip that takes all ten champions into account:
  - **Your lane opponent:** how to play the lane, with trading windows from their cooldowns. *"When Darius's Q, Decimate, is on cooldown, go in with Decisive Strike and Judgment, then back off before five bleed stacks."*
  - **Other enemies:** their threat and how it combines with their team (e.g. Leona's root into a Sejuani gank).
  - **Teammates:** synergy and how to play with them.
  - **Yourself:** your lane or game plan.
  - In game, each tip ends with **one next item** chosen for the whole enemy team and what they're building.
- **Natural voice:** callouts and tips are read by Kokoro, a neural voice that runs locally and for free. It falls back to the Windows voice.

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

`"ai": { "model": ... }` defaults to `claude-opus-5-5`. `"ai": { "enabled": false }` turns tips off.

**Cost (measured):** the first tip in a game is about **$0.05**, because it sends every champion's abilities and the item list. Later tips within 5 minutes reuse that cached part, about **$0.01** each. A game with ~10 clicks costs roughly $0.10–0.15, so $100 of credit covers several hundred games. Set `"model": "claude-haiku-5-5"` for roughly 1/40th of that cost.

How tips are made:
- The cached part of the prompt has all ten champions with their **real ability descriptions and cooldowns from Data Dragon**, your lane opponent(s), and the current list of finished items. The changing part has the game minute, everyone's level, score and items, and your gold.
- The AI only describes listed abilities and recommends items by exact name from the list, so it doesn't invent a stun or an item that doesn't exist.
- A tip is reused for repeat clicks until someone buys an item. After that, clicking again gives fresh advice.
- If the model declines a request, the API retries on a fallback model within the same call (`fallbacks: "default"`).
- The overlay ignores the mouse except while the pointer is over the panel. Clicking a portrait doesn't take focus away from League.

### Voice (Kokoro)

Kokoro (82M parameters, `kokoro-js`) runs on your CPU in a background thread. On first run it downloads its model (~90 MB) from Hugging Face into `%APPDATA%\league-coach\models`, and the overlay footer shows the progress. Until then, and if it ever fails, the Windows voice is used.

| Setting in `config.json` | Default | |
|---|---|---|
| `voiceEngine` | `"kokoro"` | `"system"` for the Windows voice |
| `kokoroVoice` | `"af_heart"` | Also try `af_bella`, `am_michael`, `am_fenrir`, `bf_emma` (British), `bm_george` |
| `voiceSpeed` | `1.1` | |
| `voice` | `true` | `false` mutes everything |

Clicking a portrait interrupts whatever is being said. Callouts queue up behind each other.

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

Voice: `src/main/voice.ts` decides between Kokoro (`src/main/ttsWorker.ts`, a worker thread) and the Windows voice. The overlay plays Kokoro's audio with Web Audio.

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
- Kokoro hasn't been heard on a real PC yet: its model download was blocked in the build environment. Its loading, fallback and interruption logic are tested.
