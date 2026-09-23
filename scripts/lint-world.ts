import { lintWarnings, lintWorld } from '../src/world/lint';
import { WORLD } from '../src/world';

const problems = lintWorld(WORLD);
const warnings = lintWarnings(WORLD);
const rules = WORLD.globalRules.length + Object.values(WORLD.rooms).reduce((n, r) => n + r.rules.length, 0);
if (problems.length) {
  console.error(`World has ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
if (warnings.length) {
  console.warn(`World has ${warnings.length} warning(s):`);
  for (const w of warnings) console.warn(`  - ${w}`);
}
console.log(`World OK (${Object.keys(WORLD.rooms).length} rooms, ${Object.keys(WORLD.items).length} items, ${Object.keys(WORLD.npcs).length} npcs, ${rules} rules, ${WORLD.phraseRules.length} phrase rules)`);
