/**
 * The Copilot prompt ladder. Pure: a prompt in, one reply out. The first rung whose requirement the prompt
 * fails answers; a prompt that passes every rung wins (rung 10). See spec §5.2.
 */
export type Rung = 0|1|2|3|4|5|6|7|8|9|10;
export type Shape = 'list' | 'table' | 'raw' | 'card' | 'text' | 'report';
export type LadderResult = { rung: Rung; text: string; hint: string; shape: Shape };
export const SHAPE_INDEX: Record<Shape, number> = { list: 0, table: 1, raw: 2, card: 3, text: 4, report: 5 };
export const WIN_FIGURE = '$1,247,930';
/** The suggestion chip under each reply: what the rung that answered is missing. */
export const RUNG_HINTS: Record<Rung, string> = {
  0: 'Try: a full sentence.',
  1: 'Try: ask about sales.',
  2: 'Try: name the semantic model.',
  3: 'Try: the certified model.',
  4: 'Try: ask about a region.',
  5: 'Try: name a quarter.',
  6: 'Try: which year?',
  7: 'Try: ask for a total.',
  8: 'Try: name the right measure.',
  9: 'Try: just the number.',
  10: '',
};

const has = (p: string, re: RegExp) => re.test(p);
const words = (p: string) => p.trim().split(/\s+/).filter(Boolean).length;

/** `polite` overrides the "please" check, for a caller that has already stripped a trailing "please" off the prompt. */
export function evaluatePrompt(raw: string, opts: { polite?: boolean } = {}): LadderResult {
  const p = raw.toLowerCase().replace(/[^a-z0-9$_ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const polite = (opts.polite ?? /\bplease\b/.test(p)) ? " You're welcome!" : '';
  const done = (r: Rung, text: string, shape: Shape): LadderResult => ({ rung: r, text: text + polite, hint: RUNG_HINTS[r], shape });
  if (words(p) > 30) return done(2, "I've summarized your question to 'sales'. " + FOURTEEN, 'list');
  if (words(p) < 3) return done(0, 'Could you be more specific? I found 1,204 things.', 'text');
  if (!has(p, /\bsales?\b/)) return done(1, "I can help with that! Here are the top 5 things in your tenant: a lakehouse, a lakehouse, a report named 'test', a lakehouse, and a warehouse called 'DO NOT DELETE'.", 'list');
  // Whole words only, with '_' as a separator too ("sales_test_do_not_use"): "latest" is not "test", "uncertified" is not "certified".
  const model = has(p, /(?<![a-z0-9])certified/) ? 'certified' : has(p, /final ?2|final_final|v3/) ? 'final2' : has(p, /(?<![a-z0-9])(test|do[_ ]?not[_ ]?use)(?![a-z0-9])/) ? 'test' : null;
  if (!model) return done(2, FOURTEEN, 'list');
  if (model !== 'certified') return done(3, model === 'final2'
    ? 'From Sales_v3_FINAL_final2: Sales: $9,104,220. Note: this model is not endorsed. I picked it because it has the most rows.'
    : 'From sales_test_DO_NOT_USE: Sales: $12. The sign said not to. I did anyway.', 'table');
  if (!has(p, /north ?east|\bne\b/)) return done(4, 'Total Sales, Sales (Certified): $4,201,377 — all regions. Did you want a region? I can do regions.', 'card');
  if (!has(p, /\bq4\b|\b(fourth|4th) quarter\b|\bquarter (4|four)\b|\b20\d\dq4\b/)) return done(5, 'Northeast Sales, all time: $2,933,012. Since 2019. Also some from 2018 that were keyed in late.', 'card');
  const year = /(?<![a-z0-9])(20\d\d)(?:q4)?(?![a-z0-9])/.exec(p)?.[1]; // "2025" or "2025q4"
  const yearNote = year && year !== '2025' ? ` (I only have 2019–2025. I've assumed 2025.)` : '';
  if (!year) return done(6, "Q4 Northeast Sales… here are 400 rows. I've included every product, every day, and a column called Column1.", 'raw');
  if (!has(p, /\btotal\b|\bsum\b|how much|\bnumber\b|\bmeasure\b|\bamount\b/)) return done(7, 'You asked for sales. These are the sales. Each one. 400 rows.' + yearNote, 'raw');
  if (!has(p, /net sales/)) return done(8, `Q4 2025 Northeast Sales Amount: $1,331,890. That includes Returns. Returns are $83,960. Just so you know. I didn't subtract them. You didn't ask.${yearNote}`, 'card');
  const single = has(p, /just the number|one number|as a card|only the total|summari[sz]e|single number|the number/) || words(p) <= 14;
  if (!single) return done(9, 'Q4 2025 Northeast Net Sales, Sales (Certified) — by product, by day, by salesperson, pivoted, 3 pages.' + yearNote, 'report');
  return done(10, `Q4 2025 Northeast Net Sales, Sales (Certified): ${WIN_FIGURE}.${yearNote}`, 'card');
}

const FOURTEEN = 'I found 14 tables with "sales" in the name across 3 semantic models: Sales, Sales_2, SalesFact, Sales Fact, sales_bronze, sales_silver, sales_gold, Sales (old), Sales (older), Sales_v3, Sales_v3_FINAL, Sales_v3_FINAL_final2, sales_test, and Sales. Which one?';
