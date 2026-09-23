import { describe, expect, it } from 'vitest';
import { newGame, step } from '../src/engine/step';
import { WORLD } from '../src/world';
const at = (c: string) => step({ ...newGame(WORLD, 2), room: 'lake.house' }, c, WORLD).output[0]!;
describe('the Lake House', () => {
  it('is west of the shore and says what it is', () => {
    const r = step({ ...newGame(WORLD, 2), room: 'lake.shore' }, 'w', WORLD);
    expect(r.state.room).toBe('lake.house');
    expect(r.output.join(' ')).toMatch(/A house\. On a lake\./);
  });
  it('every bit lands', () => {
    expect(at('open door')).toMatch(/files on the left/i);
    expect(at('sit')).toMatch(/billed/i);
    expect(at('look at sign')).toMatch(/serif/i);
    expect(at('knock')).toMatch(/Spark session/);
    expect(at('buy house')).toMatch(/storage/i);
    expect(at('swim')).toMatch(/inside a house while swimming/i);
    expect(at('look at mailbox')).toMatch(/CSV/);
    expect(at('fish')).toMatch(/Delta log/);
  });
  it('awards nothing and the golden path is unaffected', async () => {
    const path = (await import('./golden-path.json')).default as string[];
    let s = newGame(WORLD, 42); for (const c of path) s = step(s, c, WORLD).state;
    expect(s.score).toBe(200);
  });
});
