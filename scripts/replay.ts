/**
 * Replay a list of raw inputs through the engine and print the transcript.
 *   npm run replay -- tests/golden-path.json [seed]
 * Input file: a JSON array of strings, or an array of Activity rows ({ raw_input, seq }) exported from the database.
 */
import { readFileSync } from 'node:fs';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';

const [, , file, seedArg] = process.argv;
if (!file) { console.error('usage: replay <inputs.json> [seed]'); process.exit(2); }
const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown;
const inputs: string[] = Array.isArray(raw)
  ? raw.map((x) => (typeof x === 'string' ? x : (x as { raw_input: string }).raw_input))
  : [];
let s = newGame(WORLD, Number(seedArg ?? 42));
let n = 0;
for (const cmd of inputs) {
  n += 1;
  const r = step(s, cmd, WORLD);
  console.log(`> ${cmd}\n${r.output.join('\n')}\n   [#${n} ${r.outcome} ${r.stepId} +${r.pointsAwarded} score=${r.state.score} turns=${r.state.turns}]\n`);
  s = r.state;
  if (s.dead) { console.log('*** DEAD ***'); break; }
  if (s.won) { console.log('*** WON ***'); break; }
}
console.log(`Final: score ${s.score}, turns ${s.turns}, room ${s.room}, dead=${s.dead}, won=${s.won}`);
