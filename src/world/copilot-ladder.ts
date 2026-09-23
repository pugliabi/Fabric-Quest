/**
 * Copilot's slot model (spec1 §2.2). Pure. A prompt sets every slot it mentions; the reply is for the first missing
 * slot in the order model → measure → region → period → shape, and always shows something wrong-but-plausible.
 * The matchers are whole-word, as before: "latest" is not "test", "uncertified" is not "certified".
 */
export type Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Shape = 'list' | 'table' | 'raw' | 'card' | 'text' | 'report';
export type Model = 'certified' | 'final2' | 'test';
export type Measure = 'net' | 'amount' | 'gross' | 'returns';
export type Slots = { model?: Model; measure?: Measure; region?: 'ne' | 'other'; q4?: boolean; year?: number; one?: boolean };
export const SHAPE_INDEX: Record<Shape, number> = { list: 0, table: 1, raw: 2, card: 3, text: 4, report: 5 };
export const WIN_FIGURE = '$1,247,930';
export const MODEL_NAME: Record<Model, string> = { certified: 'Sales (Certified)', final2: 'Sales_v3_FINAL_final2', test: 'sales_test_DO_NOT_USE' };
export const MEASURE_NAME: Record<Measure, string> = { net: 'Net Sales', amount: 'Sales Amount', gross: 'Gross Sales', returns: 'Returns' };
/** The slots as stored in flags (`copilot.model`, `copilot.measure`): 0 = unset. */
export const MODEL_CODE: Record<Model, number> = { certified: 1, final2: 2, test: 3 };
export const MEASURE_CODE: Record<Measure, number> = { net: 1, amount: 2, gross: 3, returns: 4 };

/** The suggestion chip under each reply: what the stage that answered is missing. */
export const STAGE_HINTS: Record<Stage, string> = {
  0: 'Try asking about sales.', 1: 'Try: use the certified model.', 2: 'Try: net sales.', 3: 'Try: for the Northeast.', 4: 'Try: Q4 2025.', 5: 'Try: just the total.', 6: '',
};
/** The third reply at the same stage stops hinting and says it. */
const EXPLICIT: Record<Stage, string> = {
  0: 'Say: SALES.', 1: 'Say: THE CERTIFIED MODEL.', 2: 'Say: NET SALES.', 3: 'Say: NORTHEAST.', 4: 'Say: Q4 2025.', 5: 'Say: JUST THE TOTAL.', 6: '',
};

const clean = (raw: string) => raw.toLowerCase().replace(/[^a-z0-9$_ ]+/g, ' ').replace(/\s+/g, ' ').trim();
const has = (p: string, re: RegExp) => re.test(p);
/** "by product" and friends: the player wants a breakdown, which is the opposite of one number. */
const BY = /\bby (product|day|salesperson|month|week|store|hour|region|customer|quarter|year)\b/;
const ONE = /\btotal\b|\bsum\b|how much|just the (number|total)|one number|as a card|only the total|single number|the number|\bnumber\b|summari[sz]e|sum it up/;
/** An answer to "Which one?" by position: "the first one", "2", "option 3", "the second model". Resolved against the list the last reply showed. */
const ORDINAL = /^(?:the |option |number |no |choice )*(first|1st|1|second|2nd|2|third|3rd|3|fourth|4th|4)(?: one| model| measure| please)?$/;
const ORDINALS: Record<string, number> = { first: 1, '1st': 1, '1': 1, second: 2, '2nd': 2, '2': 2, third: 3, '3rd': 3, '3': 3, fourth: 4, '4th': 4, '4': 4 };
/** The lists as Copilot reads them out at stage 1 and stage 2, in order. */
const MODELS_LISTED: Model[] = ['certified', 'final2', 'test'];
const MEASURES_LISTED: Measure[] = ['amount', 'net', 'gross', 'returns'];

/**
 * Every slot the prompt mentions. `at` is the stage the player is answering (the last reply's): only then does an
 * ordinal ("the first one") mean something, and it means a position in the list that stage read out.
 */
export function parseSlots(raw: string, at?: number): { slots: Slots; sales: boolean; tables: boolean } {
  const p = clean(raw);
  const slots: Slots = {};
  // Whole words only, with '_' as a separator too ("sales_test_do_not_use"): "latest" is not "test", "uncertified" is not "certified".
  // The Gallery's own words for the certified model count too: the badge, the gold one, the endorsed one.
  if (has(p, /not endorsed|unendorsed|no badge|without (a |the )?badge/)) slots.model = 'final2';
  else if (has(p, /(?<![a-z0-9])certified|(?<![a-z0-9])endorsed(?![a-z0-9])|\bbadge\b|\bgold\b/)) slots.model = 'certified';
  else if (has(p, /final ?2|final_final|v3|\bbiggest\b|most rows/)) slots.model = 'final2';
  else if (has(p, /(?<![a-z0-9])(test|do[_ ]?not[_ ]?use)(?![a-z0-9])/)) slots.model = 'test';
  if (has(p, /net sales|\bnet\b/)) slots.measure = 'net';
  else if (has(p, /sales amount|\bamount\b/)) slots.measure = 'amount';
  else if (has(p, /gross sales|\bgross\b/)) slots.measure = 'gross';
  else if (has(p, /\breturns?\b/)) slots.measure = 'returns';
  if (has(p, /north ?east|\bne\b/)) slots.region = 'ne';
  else if (has(p, /\b(southeast|midwest|west|south|north|east|unknown|emea|apac|europe)\b/)) slots.region = 'other';
  if (has(p, /\bq4\b|\b(fourth|4th|last|final) quarter\b|\bquarter (4|four)\b|\b20\d\dq4\b/)) slots.q4 = true;
  const year = /(?<![a-z0-9])(20\d\d)(?:q4)?(?![a-z0-9])/.exec(p)?.[1]; // "2025" or "2025q4"
  if (year) slots.year = Number(year);
  if (has(p, BY)) slots.one = false;
  else if (has(p, ONE)) slots.one = true;
  const ord = ORDINAL.exec(p)?.[1];
  if (ord !== undefined) {
    const n = ORDINALS[ord]!;
    if (at === 1 && n <= MODELS_LISTED.length) slots.model = MODELS_LISTED[n - 1];
    else if (at === 2 && n <= MEASURES_LISTED.length) slots.measure = MEASURES_LISTED[n - 1];
  }
  return { slots, sales: has(p, /\bsales?\b/), tables: has(p, /\btables?\b/) };
}

/** What was said before stays; what is said now wins. */
export function mergeSlots(prev: Slots, next: Slots): Slots {
  const out: Slots = { ...prev };
  for (const [k, v] of Object.entries(next)) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  return out;
}

/** The first missing (or wrong) slot, in the fixed order. `sales`: the prompt mentioned sales at all (stage 0 otherwise). */
export function stageOf(slots: Slots, sales: boolean): Stage {
  if (!sales && Object.keys(slots).length === 0) return 0;
  if (slots.model !== 'certified') return 1;
  if (slots.measure !== 'net') return 2;
  if (slots.region !== 'ne') return 3;
  if (!slots.q4 || !slots.year) return 4;
  if (!slots.one) return 5;
  return 6;
}

/** The same stage, asked again: Copilot is thrilled to be wrong in the same way twice. */
const SECOND_OPENER: Record<Stage, string> = {
  0: 'Great question! ', 1: 'Love a follow-up! ', 2: 'Ooh, getting warmer! ', 3: 'Happy to help again! ', 4: 'So close now! ', 5: 'Almost there! ', 6: '',
};
/** `please`, by how many times this stage has been asked: the manners are noted; they are not used. */
const POLITE = [" You're welcome!", " You're welcome! Again!", " You're SO welcome. Manners don't change the answer, but they are logged."];

const FOURTEEN = 'I found 14 tables with "sales" in the name across 3 semantic models: Sales, Sales_2, SalesFact, Sales Fact, sales_bronze, sales_silver, sales_gold, Sales (old), Sales (older), Sales_v3, Sales_v3_FINAL, Sales_v3_FINAL_final2, sales_test, and Sales. Which one?';

/** The context line: everything Copilot has understood so far, or a dash. */
function contextOf(slots: Slots): string {
  const bits: string[] = [];
  if (slots.model) bits.push(`model = ${MODEL_NAME[slots.model]}`);
  if (slots.measure) bits.push(`measure = ${MEASURE_NAME[slots.measure]}`);
  if (slots.region) bits.push(`region = ${slots.region === 'ne' ? 'Northeast' : 'not the Northeast'}`);
  if (slots.q4 || slots.year) bits.push(`period = ${slots.q4 ? 'Q4' : 'some quarter'} ${slots.year ? (slots.year === 2025 ? '2025' : '2025 (assumed)') : '…'}`.trim());
  if (slots.one) bits.push('shape = one number');
  return `[Understood: ${bits.length ? bits.join(' · ') : '—'}]`;
}

/**
 * The reply for a stage: the wrong-but-plausible thing, the context line, the hint (explicit from the third reply at
 * the same stage, `nth`), and the bubble shape the scene draws. `tables`: the prompt asked for tables; `polite`: it said please.
 */
export function replyFor(slots: Slots, stage: Stage, opts: { tables: boolean; polite: boolean; nth: number }): { text: string; context: string; hint: string; shape: Shape } {
  const yearNote = slots.year && slots.year !== 2025 ? " (I only have 2019–2025. I've assumed 2025.)" : '';
  // The second reply at the same stage opens with fresh enthusiasm; the answer after it is the same answer.
  const opener = opts.nth === 2 ? SECOND_OPENER[stage] : '';
  const polite = opts.polite ? POLITE[Math.min(opts.nth, POLITE.length) - 1] : '';
  const done = (text: string, shape: Shape) => ({ text: opener + text + polite, context: contextOf(slots), hint: opts.nth >= 3 ? EXPLICIT[stage] : STAGE_HINTS[stage], shape });
  switch (stage) {
    case 0: return done("I can help with that! Here are the top 5 things in your tenant: a lakehouse, a lakehouse, a report named 'test', a lakehouse, and a warehouse called DO NOT DELETE.", 'list');
    case 1:
      if (slots.model === 'final2') return done('From Sales_v3_FINAL_final2: Sales: $9,104,220. Note: this model is not endorsed. I picked it because it has the most rows.', 'table');
      if (slots.model === 'test') return done('From sales_test_DO_NOT_USE: $12. The sign said not to. I did anyway.', 'table');
      return done(opts.tables ? FOURTEEN : 'I found 3 semantic models with sales: Sales (Certified), Sales_v3_FINAL_final2, sales_test_DO_NOT_USE. Which one?', 'list');
    case 2:
      if (slots.measure === 'amount') return done("Sales Amount, Sales (Certified): $4,285,337. That includes Returns, $83,960; I didn't subtract them, and you didn't ask.", 'card');
      if (slots.measure === 'gross') return done('Gross Sales, Sales (Certified): $4,285,337. Gross is Sales Amount with a nicer name. Returns are still in there.', 'card');
      if (slots.measure === 'returns') return done('Returns, Sales (Certified): $83,960. That is the opposite of what you sell. I can subtract it from something if you name the something.', 'card');
      return done(opts.tables ? 'From Sales (Certified): 14 tables. The Sales table has 400 rows. Here they are.' : 'Sales in Sales (Certified): I found 6 measures: Sales Amount, Net Sales, Gross Sales, Returns, Sales YTD, Measure 2 (copy). Which?', opts.tables ? 'raw' : 'list');
    case 3:
      if (slots.region === 'other') return done('Net Sales, Sales (Certified), the region you named: $998,101, all time. That is not the Northeast, if you were wondering. Did you want the Northeast?', 'card');
      return done('Net Sales, Sales (Certified): $4,201,377 — all regions, all time. Did you want a region? I can do regions: Northeast, Southeast, Midwest, West, Unknown.', 'card');
    case 4:
      if (slots.q4) return done("Q4 Northeast Net Sales… here are 400 rows. I've included every product, every day, and a column called Column1." + yearNote, 'raw');
      return done('Northeast Net Sales, all time: $2,933,012. Since 2019. Also some from 2018 that were keyed in late. Which quarter?', 'card');
    case 5: return done('Q4 2025 Northeast Net Sales, Sales (Certified) — by product, by day, by salesperson, pivoted, 3 pages.' + yearNote, 'report');
    default: return done(`Q4 2025 Northeast Net Sales, Sales (Certified): ${WIN_FIGURE}.${yearNote}`, 'card');
  }
}
