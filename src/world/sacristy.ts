import type { Dir, GameState } from '../engine/types';
import type { Item, PhraseRule, Room, RuleThen } from './types';
import { SETTING_KEYS, changedFromDefault, defaultOf, flagOf, isFlood, setting, type Setting, type Shelf, type SettingKey } from '../engine/governance';
import { MALAPROPS } from './voice';

export const SACRISTY = 'monastery.sacristy';

/**
 * The two shelves (spec2 §3.3, §3.4). Titles are the real setting names from the Admin Portal (tenant settings index,
 * capacity settings); the narrator never invents settings. `read` paraphrases the Learn text, then says what the book
 * does HERE. The two killing books carry their death text in `on`: the output line, a newline, the card line.
 */
export const SETTINGS: Setting[] = [
  { key: 'export', shelf: 'tenant', title: 'Export to Excel', words: ['export', 'excel', 'analyze', 'export data', 'export to excel', 'users can export data'],
    read: "Lets anyone export the data behind a visual to an Excel file. Every Jeff in the realm depends on it, and so does every 4.7M. Here, that means: Jeff's Excel opens while it's on, and Jeff gets a locked fridge when it's off.",
    on: 'Export to Excel is back. Somewhere in the Square, Jeff feels it in his wrists.', off: 'Export to Excel is off. The Square goes quiet in a way you will come to miss.', effect: "Off: Jeff's Excel is closed for business." },
  { key: 'copilot', shelf: 'tenant', title: 'Users can use Copilot and other features powered by Azure OpenAI', words: ['copilot', 'openai', 'azure openai', 'ai'],
    read: "Turns on Copilot for everyone in the tenant, plus everything else with a sparkle on it. It is very helpful and would like you to know that. Here, that means: the Copilot side quest exists while it's on.",
    on: 'Copilot is available again. A sparkle appears over the Sacristy, then thinks better of it.', off: 'Copilot is not available in your tenant. The sparkle goes out. It was the only light in here you could argue with.', effect: 'Off: every Copilot trigger says contact your administrator, and you are your administrator.' },
  { key: 'fabricItems', shelf: 'tenant', title: 'Users can create Fabric items', words: ['fabric items', 'items', 'create fabric items', 'create items'],
    read: 'Lets people create Lakehouses, Notebooks, Warehouses and the rest of the menu. Off, and the tenant is Power BI with extra steps. Here, that means: Brother Pandas cannot make a Notebook, and the Hoodie stays on the Abbot.',
    on: 'Fabric items are back on the menu. Somewhere, a monk starts a Spark session out of sheer relief.', off: 'Users can no longer create Fabric items. The Monastery keeps chanting. Now it is chanting at a report.', effect: 'Off: the scroll cannot fix the notebook until this is on again.' },
  { key: 'publishToWeb', shelf: 'tenant', title: 'Publish to web', words: ['publish to web', 'web', 'publish', 'internet publishing'],
    read: 'Lets anyone embed a report on the public internet, where anyone means anyone. The Learn text has a warning box; the warning box has a warning. Here, that means: the prophecy is on the internet while this is on, and My Workspace offers you the same.',
    on: 'Publish to web is on. 4,112 people can read the prophecy again. One of them is a dragon.', off: 'Publish to web is off. The prophecy is private again. The embed codes go dark, one by one, like the Mill.', effect: 'On: the notice board has views, and My Workspace offers the entire internet.' },
  { key: 'guests', shelf: 'tenant', title: 'Guest users can access Microsoft Fabric', words: ['guest', 'guests', 'guest users', 'b2b'],
    read: 'Lets B2B guests, invited from other tenants, into your Fabric. With the org-wide app setting also on, that is everyone, plus their friends. Here, that means: with Publish apps to the entire organization also on, the whole organization comes to the Square.',
    on: 'Guest users can access Fabric. You hear a door open somewhere very far away, and then a great many doors.', off: "Guest users are out. The tenant is yours again, and Jeff's.", effect: 'On, with Publish apps to the entire organization: the flood.' },
  { key: 'publishOrg', shelf: 'tenant', title: 'Publish apps to the entire organization', words: ['organization', 'entire organization', 'org', 'apps', 'publish apps', 'whole org'],
    read: 'Lets app creators publish to everyone in the org at once, rather than to a list of names. It is one checkbox; it is a very large checkbox. Here, that means: with guests on, everyone in the organization is in the Square, refreshing.',
    on: 'Apps can be published to the entire organization. The organization notices.', off: 'Apps go back to being published to a list of names. The list is short and one of the names is Jeff.', effect: 'On, with Guest users: the flood.' },
  // A killing book's `words` are only the phrases that name it unambiguously: 'internet' alone is asking for the
  // opposite, and gets the KILLER_WARNING instead of a death (findBooks still finds it by title for `read`).
  { key: 'blockInternet', shelf: 'tenant', title: 'Block Public Internet Access', words: ['block public internet', 'block public internet access', 'block internet', 'block'],
    read: 'Blocks inbound public internet access to the tenant, so only private links reach it. The Learn text says to set up the private endpoint first. You have not. Here, that means: turn it on from the public internet and you are standing on nothing.',
    on: 'Keep in mind, turning this on could take 10 to 20 minutes to take effect. It takes four seconds. You are on the public internet. You were.\nYou blocked public internet access. From the public internet. Someone will need to finish the set-up process in Azure. It will not be you. The book said private endpoint first. You read that part the way you read a license agreement.',
    off: 'Public internet access is unblocked. It was never blocked; you were.', effect: 'On: you die. It is not a metaphor.', die: 'death.block-internet' },
  { key: 'feedback', shelf: 'tenant', title: 'Product Feedback', words: ['feedback', 'product feedback', 'survey', 'surveys'],
    read: 'Lets Microsoft show in-product surveys so users can rate the experience while having it. Zero to ten, how likely are you to recommend this sentence. Here, that means: every fifth turn asks you a question, and a bare number answers it.',
    on: 'Product feedback is on. A small survey slides in from the bottom right, and it is already thanking you.', off: 'Product feedback is off. The surveys stop. Your feedback has been noted, and by noted, we mean deleted.', effect: 'On: a survey every fifth turn.' },
  { key: 'usageMetrics', shelf: 'tenant', title: 'Per-user data in usage metrics for content creators', words: ['usage', 'usage metrics', 'per-user', 'per user', 'metrics'],
    read: 'Lets report creators see which named users opened their content, not just how many. It is meant for adoption. It is used for grudges. Here, that means: every fourth turn tells you who has been looking, and one of them is you.',
    on: 'Per-user usage metrics are on. Somewhere a content creator opens a report about you.', off: 'Per-user usage metrics are off. Jeff is a number again. He preferred it.', effect: 'On: a usage line every fourth turn.' },
  { key: 'monitoring', shelf: 'tenant', title: 'Workspace admins can turn on monitoring for their workspaces', words: ['monitoring', 'workspace monitoring', 'monitor', 'eventhouse'],
    read: 'Lets a workspace admin turn on workspace monitoring, which lands operation logs in a read-only Eventhouse. Everything you do, timestamped, in KQL. Here, that means: an Eventhouse hums in the corner of My Workspace and logs you looking at it.',
    on: 'Workspace monitoring is on. A read-only Eventhouse appears in the corner of My Workspace and begins, immediately, to hum.', off: 'Workspace monitoring is off. The Eventhouse in your workspace stops humming. It keeps the logs.', effect: 'On: an Eventhouse in My Workspace.' },
  { key: 'discover', shelf: 'tenant', title: 'Discover content', words: ['discover', 'discover content', 'discovery', 'discoverable'],
    read: "Lets users find endorsed content they don't have access to yet, in the OneLake catalog, with a name and an owner to ask. Off, and the certified model is a rumor. Here, that means: the Model Gallery's gold badge loses its label.",
    on: 'Discover content is on. The certified model gets its name back, on a small brass plate.', off: "Discover content is off. The certified model is still certified. Nobody can find out what it's called.", effect: "Off: the gallery's badge has no name." },
  { key: 'pause', shelf: 'capacity', title: 'Pause capacity', words: ['pause', 'pause capacity', 'paused'],
    read: 'Pauses the capacity so it stops billing and stops everything else, including the app you are reading this in. Resume takes a moment; the moment is not yours. Here, that means: you are running on this capacity.',
    on: "You pause the capacity. Everything stops. The refreshes. The dragon. The part of you that was running on it.\nYou paused the capacity you were standing on. Capacities are billed per second. So, it turns out, are peasants. The book said 'including the app you are reading this in.' You were reading it in the app.",
    off: 'The capacity resumes. It was never paused; you were.', effect: 'On: you die. Per second.', die: 'death.pause-capacity' },
  { key: 'autoscale', shelf: 'capacity', title: 'Autoscale', words: ['autoscale', 'auto scale', 'scale', 'auto-scale'],
    read: 'Lets the capacity borrow extra CUs when it is busy, for a fee, so interactive operations are not delayed. Finance is emailed about the fee. Here, that means: no interactive delay on the Peaks, and a bill every tenth turn.',
    on: 'Autoscale is on. The Peaks feel faster already. A bill is drafted, then a second bill about the first.', off: 'Autoscale is off. The Peaks slow back down. Finance sends a thank-you, which is somehow worse.', effect: 'On: the Peaks stop delaying you, and Finance starts.' },
  { key: 'surge', shelf: 'capacity', title: 'Surge protection', words: ['surge', 'surge protection', 'protection'],
    read: 'Caps background operations when the capacity is under strain, so interactive work still gets through. It does not stop the strain; it wears a hard hat. Here, that means: Throttlor wears one too.',
    on: 'Surge protection is on. Somewhere on the Peaks, a dragon puts on a hard hat.', off: 'Surge protection is off. The hard hat comes off. The dragon looks the same. He always looked the same.', effect: 'On: the dragon has a hat. That is all.' },
  { key: 'xmla', shelf: 'capacity', title: 'XMLA endpoint: Read Write', words: ['xmla', 'xmla endpoint', 'endpoint', 'read write'],
    read: "Opens the semantic model's XMLA endpoint to tools other than Power BI, for reading and writing the model. It is how engineers get in. Here, that means: the Model View's back gate onto the Monastery.",
    on: 'The XMLA endpoint is Read Write. The back gate in the Model View unbolts with a sound like a Tabular Editor loading.', off: "The XMLA endpoint is Off. The Model View's back gate is a wall now. The monks are on the other side of it, waiting.", effect: 'Off: the back gate to the Monastery is closed.' },
  { key: 'workloads', shelf: 'capacity', title: 'Delegated tenant settings: Users can create Fabric items', words: ['workloads', 'fabric workloads', 'delegated', 'workload', 'delegated tenant settings', 'delegated settings', 'override'],
    read: 'Lets a capacity admin override the tenant and decide, per capacity, whether Fabric items get created there at all. The tenant said yes; the capacity can still say no. Here, that means: same as Fabric items off, plus a footnote.',
    on: 'The capacity stops overriding the tenant. Fabric items are back, and the footnote is removed.', off: 'The capacity overrides the tenant: no Fabric items here. Same effect as turning off Fabric items, with a footnote saying so.', effect: 'Off: no Notebook for Brother Pandas. (Delegated. Also off.)' },
];
export const settingByKey = (key: SettingKey): Setting => SETTINGS.find((b) => b.key === key)!;

/**
 * The book(s) keeping Brother Pandas from a Notebook (spec2 §3.3–3.4): the shelf's Users can create Fabric items, the
 * Ledger's Delegated one, or both. Every hint that names the switch names the right one (review E2 I1).
 */
export const notebookBlockers = (s: GameState): SettingKey[] => (['fabricItems', 'workloads'] as const).filter((k) => !setting(s, k));
/** Where the switch is, in words, for a hint: "Users can create Fabric items, on the shelf" / "Delegated tenant settings, in the Capacity Ledger" / both. */
export function notebookBlockerText(s: GameState): string {
  const off = notebookBlockers(s);
  if (off.length === 2) return 'Users can create Fabric items, on the shelf, and Delegated tenant settings, in the Capacity Ledger, are both';
  return off[0] === 'workloads' ? 'Delegated tenant settings, in the Capacity Ledger, is' : 'Users can create Fabric items, on the shelf, is';
}

const state = (s: GameState, b: Setting) => `${setting(s, b.key) ? '[ON ]' : '[OFF]'} ${b.title}${setting(s, b.key) !== defaultOf(s, b.key) ? ' *' : ''}`;
export const shelfListing = (s: GameState, shelf: Shelf): string => SETTINGS.filter((b) => b.shelf === shelf).map((b) => state(s, b)).join('\n');
/** Both shelves; god mode's `settings` prints this anywhere (Task E7). */
export const settingsListing = (s: GameState): string => `TENANT SETTINGS\n${shelfListing(s, 'tenant')}\n\nCAPACITY LEDGER\n${shelfListing(s, 'capacity')}`;

/** What `read <book>` / `look at <book>` prints: the paraphrase, the state, the effect here. */
export const bookText = (s: GameState, b: Setting): string => `${b.read}\nIt is ${setting(s, b.key) ? 'ON' : 'OFF'}${setting(s, b.key) !== defaultOf(s, b.key) ? ' (changed from default)' : ''}. ${b.effect}`;

/**
 * The books' inventory blurbs (spec1 §5.2, Task F3): every item has one, and the only way a bolted book reaches your
 * pocket is god mode's `summon`, so each admits it left the shelf. Keyed by setting so a new book cannot forget one.
 */
export const BOOK_BLURBS: Record<SettingKey, string> = {
  export: 'Export to Excel, the book. It was bolted to the shelf, and every Jeff in the realm felt it leave.',
  copilot: 'The Copilot book. It is very helpful and would like you to know that, from inside your pocket.',
  fabricItems: 'Users can create Fabric items, the book. Off the shelf, Brother Pandas is a Power BI user with extra steps.',
  publishToWeb: 'Publish to web, the book. The warning box has a warning, and you tore it out with the page.',
  guests: 'Guest users can access Microsoft Fabric, the book. You hear a door open somewhere very far away, and it is the cover.',
  publishOrg: 'Publish apps to the entire organization, the book. One checkbox, and now it is a very large checkbox in a very small pocket.',
  blockInternet: 'Block Public Internet Access, the book. Private endpoint first, it says, and you are carrying it on the public internet.',
  feedback: 'Product Feedback, the book. Zero to ten, how likely are you to recommend this pocket.',
  usageMetrics: 'Per-user data in usage metrics for content creators, the book. It is meant for adoption, and somebody with a grudge now knows you took it.',
  monitoring: 'Workspace admins can turn on monitoring for their workspaces, the book. The Eventhouse logged you taking it, in KQL.',
  discover: 'Discover content, the book. Off the shelf, the certified model is a rumor, and somebody is going to ask who owns it.',
  pause: 'Pause capacity, the book. It stops everything, including the app you are reading this in, so do not open it in here.',
  autoscale: 'Autoscale, the book. It borrows CUs when it is busy, and it has billed Finance for the pocket.',
  surge: 'Surge protection, the book. It does not stop the strain; it wears a hard hat, and the dragon wants his back.',
  xmla: 'XMLA endpoint: Read Write, the book. It is how engineers get in, and it is how the book got out.',
  workloads: 'Delegated tenant settings, the book. The tenant said yes, the capacity said no, and you said mine.',
};

/** Book items, so the books are things in the room (`get export` is refused with the bolted line; god-mode `locate` sees them). Reading goes through `sacristy.read`. */
export const BOOK_ITEMS: Item[] = SETTINGS.map((b) => ({
  id: `book-${b.key}`, name: b.title, aliases: [...b.words, b.title.toLowerCase(), `${b.words[0]} book`],
  takeable: false, untakeableText: 'The books are bolted to the shelf. Governance.',
  blurb: BOOK_BLURBS[b.key],
  describe: (s) => bookText(s, b),
}));

/** "the export book" → "export"; "delegated tenant settings" → "delegated tenant". */
const bookTarget = (target: string): string => target.trim().toLowerCase().replace(/^(the |book of |book )/, '').replace(/( book| setting| settings)$/, '');
const escapeRe = (w: string): string => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Whether `w` appears as a whole word (or whole phrase) inside `t`. */
const inside = (t: string, w: string): boolean => new RegExp(`(^|\\s)${escapeRe(w)}(\\s|$)`).test(t);
/** Title words that name nothing on their own ("turn off the" is not a book). */
const STOP = new Set(['the', 'a', 'an', 'to', 'for', 'in', 'on', 'can', 'and', 'of', 'with', 'their', 'other', 'by', 'from', 'is', 'it', 'its', 'be', 'are', 'use']);

/** Whether the target names this book outright: its full title, or one of its distinctive words. A killer flips only when named. */
export const namesBook = (book: Setting, target: string): boolean => {
  const t = bookTarget(target);
  return book.title.toLowerCase() === t || book.words.includes(t) || book.words.some((w) => inside(t, w));
};

/**
 * A book by any distinctive word or the full title; several when ambiguous. When no distinctive word matches, any
 * book whose title contains one of the target's words is a candidate ("users", "fabric"), so the reply can list them.
 */
export function findBooks(target: string): Setting[] {
  const t = bookTarget(target);
  const exact = SETTINGS.filter((b) => b.title.toLowerCase() === t || b.words.includes(t));
  if (exact.length === 1) return exact;
  const byWord = SETTINGS.filter((b) => b.words.some((w) => inside(t, w)));
  if (byWord.length) return byWord;
  // The books whose titles contain the most of the target's words: "public internet access" is the one about the internet,
  // not also the one about guest access; "users" alone ties four ways and stays ambiguous.
  const words = t.split(/\s+/).filter((w) => w && !STOP.has(w));
  const scored = SETTINGS.map((b) => ({ b, n: words.filter((w) => inside(b.title.toLowerCase(), w)).length }));
  const best = Math.max(0, ...scored.map((x) => x.n));
  return best ? scored.filter((x) => x.n === best).map((x) => x.b) : [];
}

/** The reply when a killing book was reached by a title word rather than by name (spec2 §4: the deaths are deliberate, not accidental). */
const KILLER_WARNING: Partial<Record<SettingKey, string>> = {
  blockInternet: 'Which book? Block Public Internet Access is the only one about the internet, and it does the opposite of what you said. Say BLOCK if you mean it.',
  pause: 'Which book? Pause capacity is the only one about the capacity, and it stops everything, including you. Say PAUSE if you mean it.',
};

/**
 * `read <book>` / `look at <book>` by any word or the full printed title. The builtin look would split a title at
 * "in" / "on", suffix-match the wrong book, or trip the Excel egg on "export to excel"; this runs first, and declines
 * (null) when no book is named so the sign, the stair and the lectern keep their own lines.
 */
export function readBook(s: GameState, target: string): { then: RuleThen; id: string } | null {
  const books = findBooks(target);
  if (books.length === 0) return null;
  if (books.length > 1) return { id: 'sacristy.which', then: { text: `Which book? ${books.map((b) => b.title).join(' · ')}`, outcome: 'fail' } };
  return { id: 'sacristy.read', then: { text: bookText(s, books[0]!), outcome: 'success' } };
}

/** The Admin Portal's own footnote, verbatim from Learn, and then the truth. */
export const FIFTEEN = 'It can take up to 15 minutes for a setting change to take effect for everyone in your organization. It takes effect now.';

/** The two bonus lines (spec2 §5). */
const ERRAND_PAID = '+10. The prophecy is private again. 4,112 people already read it.';
const RESTORED = 'Every setting is back where you found it. Nobody will ever know. +5 for governance.';
/** A book flipped back to its default when that does not finish the restore (the voice sweep, Task F11). */
export const FLIP_BACK = 'You put it back the way it was. Nobody will know. The audit log will know.';
/**
 * Governance restored (spec2 §5): `gov.touched` (set by a flip AWAY from default) and every book about to be back at its
 * default, paid once. `keys` is what is off its default in `s`, before this turn; the caller says which of them it puts back.
 */
const restores = (s: GameState, putsBack: (k: SettingKey) => boolean): boolean => {
  const off = changedFromDefault(s);
  return !!s.flags['gov.touched'] && off.length > 0 && off.every(putsBack) && !s.flags['bonus.gov.restored'];
};

/**
 * Flip one book. The flood ends here when either of its books goes off (spec2 §3.5). The errand (spec2 §5): turning
 * Publish to web off while the Abbot has asked pays +10 and makes OFF its default from then on (`gov.errandDone`, read by
 * defaultOf), so that flip moves the book away from its then-default and never doubles as the +5; the restore is paid by
 * the flip that puts the LAST non-default book back.
 */
export function flip(s: GameState, target: string, mode: 'on' | 'off' | 'toggle'): { then: RuleThen; id: string } {
  if (/^(everything|all|all settings|all books|every book|every setting|the lot)$/.test(target.trim().toLowerCase())) return { id: 'sacristy.all', then: { text: 'You are not that kind of admin. One book at a time.', outcome: 'fail' } };
  const books = findBooks(target);
  if (books.length === 0) return { id: 'sacristy.nobook', then: { text: `No book answers to '${target}'. \`settings\` lists the shelf; \`capacity settings\` lists the ledger.`, outcome: 'fail' } };
  if (books.length > 1) return { id: 'sacristy.which', then: { text: `Which book? ${books.map((b) => b.title).join(' · ')}`, outcome: 'fail' } };
  const book = books[0]!;
  const cur = setting(s, book.key);
  const want = mode === 'toggle' ? !cur : mode === 'on';
  // A killing book flips only when the phrase names it ("block public internet", "pause capacity"); "turn on internet" does not.
  if (want && book.die && !namesBook(book, target)) return { id: 'sacristy.which', then: { text: KILLER_WARNING[book.key] ?? `Which book? ${book.title} is the only one that matches, and it kills you. Say its name if you mean it.`, outcome: 'fail' } };
  if (want === cur) return { id: `sacristy.${book.key}.already`, then: { text: `It is already ${cur ? 'on' : 'off'}. You click it anyway. Nothing changes. It felt good.`, outcome: 'fail' } };
  // A killing book: the death text, no flag (spec2 §4: the setting is not persisted; restore puts you back before it).
  if (want && book.die) return { id: `sacristy.${book.key}.on`, then: { text: book.on, death: book.die } };
  const away = want !== defaultOf(s, book.key);
  const set: Record<string, boolean> = { [flagOf(book.key)]: want, ...(away ? { 'gov.touched': true } : {}) };
  const after: GameState = { ...s, flags: { ...s.flags, [flagOf(book.key)]: want } };
  const lines = [want ? book.on : book.off, FIFTEEN];
  if (isFlood(s) && !isFlood(after)) lines.push('The organization files out. Jeff from Ops takes a mug. Not yours.');
  let bonus: { bonus: number; pointsKey: string } | undefined;
  if (book.key === 'publishToWeb' && !want && s.flags['gov.errand'] && !s.flags['bonus.gov.abbot']) {
    lines.push(ERRAND_PAID);
    bonus = { bonus: 10, pointsKey: 'gov.abbot' };
    set['gov.errandDone'] = true;
  } else if (!away && restores(s, (k) => k === book.key)) {
    lines.push(RESTORED);
    bonus = { bonus: 5, pointsKey: 'gov.restored' };
  } else if (!away) lines.push(FLIP_BACK);
  return { id: `sacristy.${book.key}.${want ? 'on' : 'off'}`, then: { text: lines.join('\n'), set, sfx: bonus ? 'bonus' : want ? 'toggle' : 'toggle-off', outcome: 'success', ...bonus } };
}

/**
 * The Keep's back gate with XMLA off (review E2 M4): an item in the Monastery Gate (after 'gate', so the progress-bar
 * gate keeps its name), and room rules in the Model View, where a hidden item would fail the Keep examinables test.
 */
export const BRICKS_NOUNS = ['bricks', 'brick', 'wall', 'bricked gate', 'back gate', 'gate', 'xmla', 'endpoint', 'xmla endpoint', 'chalk'];
export const BRICKS_TEXT = {
  model: 'Bricks, where the back gate was. XMLA is chalked on them, and under it, smaller: OFF. Up in the Sacristy, a ledger has the switch. Down here, you have a wall.',
  gate: "Bricks, where the Keep's back gate was. XMLA is chalked on them, and under it, smaller: OFF. Three monks lean on it. It is the most support the endpoint has had.",
  take: 'You pull at a brick. It is Read Only.',
  push: 'You push the wall. The wall is an endpoint. Endpoints do not push; they are called.',
};

/**
 * The way to the monks while the Keep's back gate is bricked (spec2 §3.4; E2 rounds 2–3): every hint that used to say
 * "through the Keep" names the Ledger's book and the long way instead, worded from the room it is read in. `steps` is
 * the walk that `words` describes; tests/setting-effects.test.ts walks each list and checks it ends at the Monastery gate.
 */
export const XMLA_DETOUR: Record<string, { steps: Dir[]; words: string }> = {
  'village.square': { steps: ['s', 's', 's', 's', 'e'], words: 'south to the OneLake, south through the marsh to its Gold layer, then east' },
  'village.fields': { steps: ['w', 's', 's', 's', 's', 'e'], words: 'west to the Square, south to the OneLake, south through the marsh to its Gold layer, then east' },
  'peaks.foothills': { steps: ['w', 'w', 's', 's', 's', 's', 'e'], words: 'west through the Fields to the Square, south to the OneLake, south through the marsh to its Gold layer, then east' },
  'peaks.ledge': { steps: ['s', 'w', 'w', 'w', 's', 's', 's', 's', 'e'], words: 'south to the Pass, west through the Foothills and the Fields to the Square, south to the OneLake, south through the marsh to its Gold layer, then east' },
  'fortress.bridge': { steps: ['s', 'w', 'w', 's', 's', 's', 's', 'e'], words: 'south to the Foothills, west through the Fields to the Square, south to the OneLake, south through the marsh to its Gold layer, then east' },
  'fortress.hall': { steps: ['s', 's', 'w', 'w', 's', 's', 's', 's', 'e'], words: 'south, and south again out the gate, to the Foothills; west through the Fields to the Square; south to the OneLake, south through the marsh to its Gold layer, then east' },
};
/** The long-way hint for a room in XMLA_DETOUR. */
export const xmlaRouteFrom = (room: string): string =>
  `The Keep's back gate to the Monastery is bricked until XMLA endpoint: Read Write is back on; the Capacity Ledger, in the Sacristy, has it. The monks are reached the long way: ${XMLA_DETOUR[room]!.words}.`;

/** The rest of the organization, in the flooded Square (also the `jeffs` item's describe, for the nouns the parser keeps whole). */
export const JEFFS_TEXT = 'Jeffs. Jeff from Ops, Jeff from HR, a Jeff you do not recognize, and behind them more Jeffs, in lanyards, refreshing. Each has a question about the report. It is the same question.';
/**
 * Global phrases for the settings (registered right after HINT_PHRASES, world/index.ts): a bare 0–10 while Product
 * Feedback is on answers the survey (spec2 §3.3), checked against the previous state so the flip that turned it on
 * doesn't count; and the flooded Square's other Jeffs.
 */
export const GOVERNANCE_PHRASES: PhraseRule[] = [
  { id: 'survey.reply', test: /^(10|[0-9])$/, after: (prev) => setting(prev, 'feedback'), text: 'Thank you. Your participation is voluntary. It was not.' },
  // The flood's other Jeffs answer to their names in the Square (review E2 M4). Raw-line rules, because the parser splits
  // "jeff from ops" at "from"; they decline when there is no flood, so at default "look at jeff from ops" is still Jeff
  // from Finance and "talk to jeff from ops" his brush-off (the parser hands him "ops" as a topic). A bare "jeff" is never these.
  { id: 'flood.look-jeffs', room: 'village.square', test: /^(look at|look|examine|x|l|inspect)\s+(the )?(jeff from (ops|hr)|other jeffs|jeffs|organization|entire organization|whole organization|everyone|crowd|a jeff you do not recognize|the jeff you do not recognize)$/, text: '',
    then: (s) => (isFlood(s) ? { then: { text: JEFFS_TEXT, outcome: 'success' } } : null) },
  // The engine counts every talk whose noun resolves to an NPC here (step.ts finish() 3d), and a talk verb on "jeff from
  // hr" parses to the noun "jeff", so that Jeff would count toward Jeff from Finance's escalation and the Jeff curse. On
  // those lines this takes one off first and the engine's bump puts it back: net nothing, which is how many words you
  // said to Jeff from Finance (Task F4). A greeting ("hey jeffs") never parses as talk, so it never bumps and never needs this.
  { id: 'flood.talk-jeffs', room: 'village.square', test: /^(talk to|talk with|speak to|speak with|ask|greet|hello|hi|hey)\s+(the )?(jeff from (ops|hr)|other jeffs|jeffs|organization|entire organization|whole organization|everyone|crowd|a jeff you do not recognize|the jeff you do not recognize)\b/, text: '',
    then: (s, _w, line) => (isFlood(s) ? { then: {
      text: '"Which Jeff." You point. Jeff from Ops steps forward. He has a question about the report. It is Jeff from Finance\'s question, in a different lanyard.',
      ...(/^(talk to|talk with|speak to|speak with|ask)\s+(the )?jeff from (ops|hr)\b/.test(line) ? { set: { 'talk.jeff': (v) => (Number(v) || 0) - 1 } } : {}),
      outcome: 'snark',
    } } : null) },
];

export function resetAll(s: GameState): { then: RuleThen; id: string } {
  const set = Object.fromEntries(SETTING_KEYS.map((k) => [flagOf(k), defaultOf(s, k)]));
  // Guests default OFF, so a reset always ends the flood (spec2 §3.5): that turn the organization does notice, so the
  // files-out line takes the place of the notices-nothing one (review E2 M3). A reset puts every book back, so it pays
  // the restore whenever anything was off its default (spec2 §5); a reset with nothing to reset touched nothing.
  const restored = restores(s, () => true);
  const text = `You put every book back the way you found it. ${isFlood(s) ? 'The organization files out. Jeff from Ops takes a mug. Not yours.' : 'The organization notices nothing. That is the job.'}${restored ? ` ${RESTORED}` : ''}`;
  return { id: 'sacristy.reset', then: { text, set, sfx: restored ? 'bonus' : 'toggle', outcome: changedFromDefault(s).length ? 'success' : 'snark', ...(restored ? { bonus: 5, pointsKey: 'gov.restored' } : {}) } };
}

const FLIP = /^(turn on|enable|switch on|turn off|disable|switch off|toggle|flip)\s+(.+)$/;
const READ = /^(read|look at|look|examine|x|inspect|l)\s+(.+)$/;
/** The stair: any way of saying "climb it" moves you, and the narrator corrects a wrong direction word. */
const STAIR = /^((climb|take|go|walk|head|ascend|descend)( up| down)?( the)?( spiral)? (stairs?|staircase|steps)|(go |walk |head |climb )?(upstairs|downstairs)|(up|down)( the)? stairs?)$/;
export const SACRISTY_PHRASES: PhraseRule[] = [
  // The listings are looks, not dead turns: `outcome: 'success'` like `look at <item>`, so four of them do not whisper the flask hint.
  // Typed again in a row (Task F11), the listing gets a line under it: the same shelf, one turn older.
  { id: 'sacristy.list', room: SACRISTY, test: /^(settings|tenant settings|list settings|list (the )?books|(look at|read|examine|x) (the )?(shelf|books|tenant settings)|shelf)$/, text: '', then: { text: (s) => `TENANT SETTINGS\n${shelfListing(s, 'tenant')}${(s.recent?.n ?? 1) >= 2 ? '\nSame shelf, one turn older. Nothing in here flips itself. That is what you are for.' : ''}`, outcome: 'success' } },
  { id: 'sacristy.ledger', room: SACRISTY, test: /^(capacity settings|capacity|capacity ledger|(look at|read|examine|x) (the )?(ledger|capacity ledger|capacity settings)|ledger)$/, text: '', then: { text: (s) => `CAPACITY LEDGER\n${shelfListing(s, 'capacity')}`, outcome: 'success' } },
  // A bare "book" would suffix-match any item with a 'book' alias, so no item has one; the narrator asks instead.
  { id: 'sacristy.which-book', room: SACRISTY, test: /^((look at|look|read|examine|x|open|get|take|turn on|turn off|toggle|flip|enable|disable) )?(a |the )?book$/, text: 'Which book? There are sixteen. `settings` lists the shelf; `capacity settings` lists the ledger.' },
  // Reading a book by any word or its full printed title, ahead of the builtin look and the global eggs (I1). Declines when no book is named.
  { id: 'sacristy.read', room: SACRISTY, test: READ, text: '', then: (s, _w, line) => readBook(s, READ.exec(line)![2]!) },
  { id: 'sacristy.flip', room: SACRISTY, test: FLIP, text: '', then: (s, _w, line) => { const m = FLIP.exec(line)!; const mode = /^(turn on|enable|switch on)$/.test(m[1]!) ? 'on' : /^(toggle|flip)$/.test(m[1]!) ? 'toggle' : 'off'; return flip(s, m[2]!, mode); } },
  // The stair, from both ends. In the Sacristy it only goes down; in the Cloister it only goes up. Either way you take it.
  { id: 'sacristy.stair-down', room: SACRISTY, test: STAIR, text: '', then: (_s, _w, line) => ({ then: { text: /\b(up|upstairs|ascend)\b/.test(line) ? 'The stair goes down from here. Up is the ceiling. You take the stair.' : 'You take the spiral stair down.', moveTo: 'monastery.cloister' } }) },
  { id: 'sacristy.stair-up', room: 'monastery.cloister', test: STAIR, text: '', then: (_s, _w, line) => ({ then: { text: /\b(down|downstairs|descend)\b/.test(line) ? 'The stair goes up from here. Down is the floor, and the monks are using it. You climb.' : 'You climb the spiral stair.', moveTo: SACRISTY } }) },
  { id: 'sacristy.reset', room: SACRISTY, test: /^(reset settings|restore defaults|defaults|reset|reset everything)$/, text: '', then: (s) => resetAll(s) },
  { id: 'sacristy.delegate', room: SACRISTY, test: /^delegate\b/, text: 'Delegated to capacity admins. The capacity admin is also you. You feel the weight of it.' },
  // The spec's bare form: `pause capacity` is `turn on pause capacity`.
  { id: 'sacristy.pause-words', room: SACRISTY, test: /^pause( the)? capacity$/, text: '', then: (s) => flip(s, 'pause', 'on') },
  // The voice sweep (Task F11): the stair as furniture.
  { id: 'sacristy.sit', room: SACRISTY, test: /^(sit|sit down|sit on (the )?stairs?|rest)$/, text: "You sit on the stair. An admin did this once, in 2019, meaning to go back up. She's a monk now." },
];

/** Any book by any of its words, for `talk to <book>` (Task F11). */
const BOOK_WORDS = new RegExp(`^(${SETTINGS.flatMap((b) => b.words).map(escapeRe).join('|')})$`);

export const SACRISTY_ROOM: Room = {
  id: SACRISTY, name: 'The Sacristy', region: 'monastery',
  enterQuip: () => 'A sign says FABRIC ADMINISTRATORS ONLY. Under it, smaller: everyone here is an admin. It was easier.',
  describe: (s) => {
    const n = changedFromDefault(s).length;
    return `The Sacristy. The Admin Portal, in stone. A shelf of thin books, each with a switch for a spine — the Tenant Settings. A lectern holds the Capacity Ledger. A sign warns you. Nobody enforces the sign. The stair is down.\n${n ? `Changed from default: ${n}` : 'Everything is at its default. Bless.'}`;
  },
  exits: { d: 'monastery.cloister' },
  items: ['shelf', 'sacristy-sign', 'sacristy-lectern', 'ledger', 'stair', ...SETTINGS.map((b) => `book-${b.key}`)],
  npcs: [],
  // The voice sweep (Task F11): the furniture answers `use`, the books do not answer `talk`, and the one word has no measure to land on.
  rules: [
    { id: 'sacristy.use-shelf', when: { verb: 'use', noun: ['shelf', 'bookshelf', 'books', 'shelves'] }, then: { text: "You run a finger along the spines. Every one is a switch. Every switch is someone's Tuesday.", outcome: 'fail' } },
    { id: 'sacristy.use-ledger', when: { verb: 'use', noun: ['ledger', 'capacity ledger'] }, then: { text: `You open the Capacity Ledger to a random page. It says F2. Not enough ${MALAPROPS.capacitude}. It closes itself.`, outcome: 'fail' } },
    { id: 'sacristy.use-lectern', when: { verb: 'use', noun: ['lectern', 'podium', 'stand'] }, then: { text: 'You stand at the lectern like you are about to present the capacity plan. Nobody came. Nobody ever comes to the capacity plan.', outcome: 'fail' } },
    { id: 'sacristy.talk-book', when: { verb: 'talk', nounMatches: BOOK_WORDS }, then: { text: 'The book does not talk. It has a switch, not a mouth. You have that backwards.', outcome: 'fail' } },
    { id: 'sacristy.say-dax', when: { verb: 'say', noun: ['dax'] }, then: { text: `You say 'DAX' in the Admin Portal. Nothing here is ${MALAPROPS.daxxed}. Nothing here is even a measure. It is all switches.`, outcome: 'snark' } },
  ],
  scene: () => 'monastery.sacristy',
  // The errand first, while it is open (spec2 §5): the one thing in here somebody asked for.
  flaskHint: (s) => (s.flags['gov.errand'] && setting(s, 'publishToWeb')
    ? 'The Abbot asked: `turn off publish to web`.'
    : changedFromDefault(s).length
      ? 'Something is off its default. `settings` shows which. `reset settings` puts every book back.'
      : 'Nothing here is required. `settings` lists the books; `turn off <book>` finds out what it did. Put it back after. Or don\'t, and see.'),
  // The aside (Task B4): the flask hint here is all backticks, so the first two tiers are all books and no commands.
  nudge: {
    oblique: (s) => (s.flags['gov.errand'] && setting(s, 'publishToWeb')
      ? "The Abbot asked you for one thing, and it's on the shelf, in a book with a switch for a spine and 4,112 readers."
      : changedFromDefault(s).length
        ? "Something in here isn't the way you found it, and the sign says nobody enforces the sign, which is not the same as nobody noticing."
        : 'Nothing in here is required. Every book has a switch, every switch does something to someone, and one of them does it to you.'),
    plainer: (s) => (s.flags['gov.errand'] && setting(s, 'publishToWeb')
      ? 'The Abbot wants the prophecy off the internet. One of these books put it there. Turn it the other way.'
      : changedFromDefault(s).length
        ? 'A book on this shelf is not at its default. The shelf can tell you which, and the shelf can put it back.'
        : 'Sixteen books, two shelves, one switch each. Pick one you understand, flip it, and go and see what it broke.'),
  },
};
