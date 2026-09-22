import { lintWorld } from '../src/world/lint';
import { WORLD } from '../src/world';

const problems = lintWorld(WORLD);
const rules = WORLD.globalRules.length + Object.values(WORLD.rooms).reduce((n, r) => n + r.rules.length, 0);
if (problems.length) {
  console.error(`World has ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`World OK (${Object.keys(WORLD.rooms).length} rooms, ${Object.keys(WORLD.items).length} items, ${Object.keys(WORLD.npcs).length} npcs, ${rules} rules, ${WORLD.phraseRules.length} phrase rules)`);
