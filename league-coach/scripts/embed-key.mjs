// Optionally builds an API key into the installer: LEAGUE_COACH_API_KEY=sk-ant-... npm run dist
// The key goes to dist/embedded-key.json (git-ignored), never into the source.
// Anyone who has the installer can extract it, so only use this for your own copy.
import fs from 'node:fs';

const file = new URL('../dist/embedded-key.json', import.meta.url);
const key = process.env.LEAGUE_COACH_API_KEY?.trim();
if (key) {
  fs.writeFileSync(file, JSON.stringify({ apiKey: key }));
  console.log('Embedded an API key into this build (do not share the installer).');
} else {
  fs.rmSync(file, { force: true });
  console.log('No LEAGUE_COACH_API_KEY set: the key is entered in Settings on first run.');
}
