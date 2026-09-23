import type { GameState } from '../engine/types';
import type { Npc } from './types';
import { isFlood, setting } from '../engine/governance';
import { notebookBlockerText, notebookBlockers } from './sacristy';
import { CLERK_NPC } from './townhall';
import { BRUSHOFFS, nick } from './voice';

const npc = (n: Npc): [string, Npc] => [n.id, n];

/**
 * The 4+ nickname lines (spec1 §3.1) walk one line per talk: talk 4 is line 0, talk 5 line 1, and so on. Keyed to the
 * talk number, not the turn, so the first thing a finished gate says is its "Lookin' good" line whatever else you did on
 * the way, and two talks in a row never repeat a line. The nickname inside still changes every turn (nick). Total for
 * any n (a branch that starts cycling at talk 2 passes `n + 2`).
 */
const cycle = (n: number, lines: readonly string[]): string => {
  const len = lines.length;
  return lines[(((n - 4) % len) + len) % len]!;
};

/**
 * The tenant, as Jeff hears it (spec2 §3.3, §3.5). In the flooded Square every Jeff answers to "Jeff", so the line
 * opens with the question; with Export off, whatever he was saying ends on the accusation, and the narrator's
 * "(Say: help jeff.)" comes off first: the narrator never names a command the game is about to refuse (Jeff asking in
 * his own words stays). Neither touches the talk counter: the wrap goes around the line, not the escalation.
 */
const jeffHears = (s: GameState, line: string): string => {
  const which = isFlood(s) && s.room === 'village.square' ? 'Which Jeff. ' : '';
  if (setting(s, 'export')) return `${which}${line}`;
  return `${which}${line.replace(/ \(Say: help jeff\.\)$/, '')} "…and now Export is off. Was that you?"`;
};

/** Users can create Fabric items is off, or the capacity says so for it (spec2 §3.3–3.4): no Notebook for Brother Pandas, while his is still broken. */
const noNotebook = (s: GameState): boolean => notebookBlockers(s).length > 0 && !s.flags['notebook.fixed'];
/** Which switch Brother Pandas points at (review E2 I1): the shelf's book, the Ledger's, or both. */
const pandasSwitch = (s: GameState): 'shelf' | 'ledger' | 'both' => { const off = notebookBlockers(s); return off.length === 2 ? 'both' : off[0] === 'workloads' ? 'ledger' : 'shelf'; };
/**
 * The Keep's back gate with XMLA off (spec2 §3.4), as the monks and the knight say it (review E2 round 2, N1): nobody
 * sends you through the wall; they name the Ledger's book and the way round.
 */
const xmlaOff = (s: GameState): boolean => !setting(s, 'xmla');

/** Sir Cardinality's advice, in order (spec §12.1): talk 1, 2 and 3. */
export const CARDINALITY_ADVICE = [
  '"One. To. Many."',
  '"Star schema. Not snowflake. Not… whatever that is."',
  '"The dragon will ask you a question. The answer is two words. I have said them already."',
];

export const NPCS: Record<string, Npc> = Object.fromEntries([
  npc({
    id: 'jeff', name: 'Jeff from Finance', aliases: ['jeff', 'finance', 'man', 'jeff from finance'],
    // Once pacified he stays by the well instead of following you into the fields.
    hiddenWhen: (s) => !!s.flags['jeff.pacified'] && s.room !== 'village.square',
    describe: (s) => (s.flags['jeff.pacified']
      ? `Jeff from Finance sits by the well, sipping from a mug, at peace.${s.flags['sq.excel.done'] ? ' He is humming. The report was right. He has told no one.' : ''}`
      : `Jeff from Finance. He is holding an empty spreadsheet like a begging bowl. ${s.flags['sq.excel.done'] ? 'He looks pleased with it, for once.' : 'He would like an export.'}`),
    // After Jeff's Excel (sq.excel.done) he has nothing left to prove, and would rather you didn't bring it up.
    // The flood and Export off wrap every line (jeffHears); at defaults the wrap is nothing.
    talk: (s) => jeffHears(s, s.flags['sq.excel.done']
      ? s.flags['jeff.pacified']
        ? 'Jeff sips from his mug. "The report was right." He checks that nobody is listening. "I have told no one. I will go on telling no one." He looks pleased, and a little pink.'
        : 'Jeff lowers his voice. "The report was right. I have told no one. I will go on telling no one." He looks pleased, and a little pink. His other hand is empty. It looks like it wants a mug.'
      : s.flags['jeff.pacified']
        ? 'Jeff sips from his mug. "Better. Now — the numbers don\'t match. Come look. Please. I have Excel open." (Say: help jeff.)'
        : '"Hey! Hey. Can you export this to Excel? Just the whole thing. All of it. Also, the numbers don\'t match the report. Come look. I have Excel open." (Say: help jeff.)'),
    // Four states (mug × Excel), each with its own variant, hint and nickname lines.
    talkMore: (s, n) => {
      const done = !!s.flags['sq.excel.done'], calm = !!s.flags['jeff.pacified'];
      if (done && calm) return jeffHears(s, n === 2 ? '"Told no one," Jeff says again. "Telling you doesn\'t count. You were there."'
        : n === 3 ? '"The report was right and I have a mug and I would like, now, to be left alone with both. The dragon is east. I read the board."'
        : cycle(n, [`"Lookin' good, ${nick(s)}. The dragon's east. I read the board."`, `"Nothing left in me, ${nick(s)}. Go be Worthy."`, `"I'm content, ${nick(s)}. It's unsettling for both of us."`]));
      if (done) return jeffHears(s, n === 2 ? '"The report was right," Jeff says, quieter, looking at his empty hand.'
        : n === 3 ? '"I told no one. I\'d tell a mug, if I had one. There\'s one on your desk. West."'
        : cycle(n, [`"Still no mug, ${nick(s)}. I proved the report right and got nothing to drink out of."`, `"Almost there, ${nick(s)}. Cottage. Desk. Mug. Me."`, `"I can be right AND thirsty, ${nick(s)}. I'm doing it now."`]));
      // Export off: even in his own voice he does not name the two words the fridge is about to refuse (round 2).
      if (calm && !setting(s, 'export')) return jeffHears(s, n === 2 ? '"The numbers, though," Jeff says into his mug. "They don\'t match. I have Excel open."'
        : n === 3 ? '"Come look at Excel. I would tell you what to say, but Export is off, and I am looking at who did it."'
        : cycle(n, [`"Lookin' good, ${nick(s)}. The spreadsheet can wait. It has to."`, `"Two words would fix this, ${nick(s)}. Neither of them is mine to say."`, `"I've got the mug, ${nick(s)}. I've still got the numbers. I've got nowhere to open them."`]));
      if (calm) return jeffHears(s, n === 2 ? '"The numbers, though," Jeff says into his mug. "They don\'t match. I have Excel open." (Say: help jeff.)'
        : n === 3 ? '"Come look at Excel. Say help jeff. I\'ll do the clicking. No I won\'t."'
        : cycle(n, [`"Lookin' good, ${nick(s)}. Now the spreadsheet."`, `"help jeff, ${nick(s)}. Two words. It's a spreadsheet, not a schema."`, `"I've got the mug, ${nick(s)}. I've still got the numbers. help jeff."`]));
      return jeffHears(s, n === 2 ? '"Export? Excel? Either. Both. I\'m flexible," says Jeff, who is not.'
        : n === 3 ? '"You know what would help? Not Excel. Well, also Excel. But that mug on your desk. West. I can see it through your window."'
        : cycle(n, [`"Still no mug, ${nick(s)}."`, `"Almost there, ${nick(s)}. The mug is in the cottage. The cottage is west. I've drawn a map on my spreadsheet."`, `"I could just take the export, ${nick(s)}. I could. I won't. Mug."`]));
    },
    brushOff: BRUSHOFFS.jeff,
    knows: ['excel', 'export', 'numbers', 'report', 'spreadsheet', 'pivot', 'mug', 'cup', 'coffee', 'desk', 'cottage', 'help', 'dragon', 'board', 'finance'],
  }),
  npc({
    id: 'miller', name: 'the Miller', aliases: ['miller', 'old miller', 'old man', 'the miller'],
    // Once the lamp is on at the lake (Task F4), the look changes: the one thing he was waiting on has happened. A
    // second look in a row (recent) gets the short one.
    describe: (s) => ((s.recent?.n ?? 1) >= 2
      ? 'Still tired. Still scheduled.'
      : `The Miller. He has run the Dataflow Gen1 Mill since before it was called that. He looks tired in a scheduled way.${s.flags['ferry.online'] ? ' He heard the lamp came on. For one scheduled interval, he looks less tired.' : ''}`),
    talk: (s) => (s.flags['has.credentials']
      ? '"They\'re decommissioning me in Q3. Take care of those creds."'
      : '"Ah, a Report Builder. The Mill\'s being decommissioned, you know. Only thing left in here is the Gen1 credentials. Been stored here since 2019."'),
    // Talk 1 is the credentials rule (village.credentials) when he still has them; every talk after that lands here.
    // Once the ferry is online there is nothing left to hint at, so the nickname lines start at talk 2 (cycle from n + 2).
    talkMore: (s, n) => (s.flags['ferry.online']
      ? cycle(n + 2, [`"Heard the lamp came on. Good. Now go away, ${nick(s)}, I'm being decommissioned."`, `"Lookin' good, ${nick(s)}. Gen1 lives on, in a boat."`, `"The Mill has nothing left for you, ${nick(s)}. It barely had that."`])
      : n === 2 ? '"Q3," says the Miller, shorter. "Take care of those creds."'
      : n === 3 ? '"The Ferryman. South to the square, south to the lake, east to the dock. Those creds are his. He\'s been OFFLINE since 2021 and I\'ve been sad about it since Q3."'
      : cycle(n, [`"Still carrying my creds, ${nick(s)}. The dock's that way."`, `"Almost there, ${nick(s)}. Square, lake, dock. Give. Not say. Give."`, `"They're a scrap of parchment, ${nick(s)}. They're not going to walk to the dock themselves."`])),
    brushOff: BRUSHOFFS.miller,
    knows: ['credentials', 'creds', 'credential', 'password', 'chest', 'gen1', 'dataflow', 'dataflows', 'mill', 'wheel', 'ferryman', 'ferry', 'dock', 'lake', 'decommission', 'decommissioning', 'q3', 'refresh'],
  }),
  npc({
    id: 'ferryman', name: 'the Ferryman', aliases: ['ferryman', 'ferry man', 'gateway', 'boatman', 'the ferryman'],
    // A second look in a row (Task F5, read off `recent`) gets the short one, in whichever state the lamp has him.
    describe: (s) => ((s.recent?.n ?? 1) >= 2
      ? (s.flags['ferry.online'] ? "He's standing like a man in a stock photo about gateways." : 'He straightens when you look, then remembers.')
      : s.flags['ferry.online']
        ? 'The Ferryman stands tall at the tiller. His lamp glows ONLINE. He is, for the first time in years, useful.'
        : 'The Ferryman. His status lamp reads OFFLINE. He has the posture of a man whose credentials expired in 2021.'),
    talk: (s) => (s.flags['ferry.online']
      ? '"ONLINE. Where to? The Isle of Gateway is the only stop. Say the word, or board."'
      : "The Ferryman's lamp reads OFFLINE. He mouths: 'Credentials expired.' A tear runs down his cheek in a way that suggests a scheduled refresh failed."),
    // Offline he only mouths; the 4+ lines know whether the creds are already in your pocket.
    talkMore: (s, n) => {
      if (s.flags['ferry.online']) return n === 2 ? '"ONLINE," he says, still tasting it. "Board when ready. I said that already. I like saying it."'
        : n === 3 ? '"Board the boat. The Isle has two keys; take STANDARD. Personal is for people who close their laptops."'
        : cycle(n, [`"Lookin' good, ${nick(s)}. Board."`, `"Still on the dock, ${nick(s)}? The boat's right there. It says GATEWAY on it."`, `He hums. It's the boarding call, ${nick(s)}. It's always the boarding call.`]);
      if (n === 2) return '"Credentials," he mouths again, slower, the way you mouth a word to someone across a very wide lake. "Expired."';
      if (n === 3) return '"Gen1 credentials. The Mill has them. West to the shore, north to the square, north again. Talk to the Miller, or open his chest; he stopped caring in 2019."';
      return s.inventory.includes('credentials')
        ? cycle(n, [`He looks at your pocket, ${nick(s)}. He looks at you. The creds are RIGHT THERE.`, `"Give," he mouths. "Credentials. To. Me." He points at himself, ${nick(s)}, in case there was doubt.`, `Almost there, ${nick(s)}. You have the creds. He has the lamp. Introduce them.`])
        : cycle(n, [`Still no creds, ${nick(s)}. The Mill. West, north, north.`, `He mouths a longer sentence. It's the directions to the Mill, ${nick(s)}.`, `"OFFLINE," he mouths at you, ${nick(s)}, as if you'd forgotten. You had.`]);
    },
    brushOff: BRUSHOFFS.ferryman,
    knows: ['credentials', 'creds', 'credential', 'password', 'gateway', 'lamp', 'status', 'offline', 'online', 'boat', 'ferry', 'isle', 'island', 'mill', 'miller', 'key', 'keys', 'standard', 'personal', 'board', 'boarding', 'refresh', 'tear'],
  }),
  npc({
    id: 'monk', name: 'the gatekeeper monk', aliases: ['monk', 'gatekeeper', 'gatekeeper monk'],
    // A second look in a row (Task F7, read off `recent`) gets the short one.
    describe: (s) => ((s.recent?.n ?? 1) >= 2 ? "He hasn't moved since you last looked. He hasn't moved since Runtime 1.1." : 'A monk in a grey robe, standing very still beside a stone progress bar.'),
    talk: () => "The monk points at the progress bar without a word. 'Session starting…'",
    // He has a vow. Talk 3 is the only time he breaks it, and only to say the one word the room wants.
    talkMore: (s, n) => (s.flags['gate.open']
      ? n === 2 ? 'The monk points at the open gate. Then at you. Then at the gate again. Some things do not need a session.'
        : n === 3 ? '"North," says the monk. First word in four minutes. "The Abbot is in the cloister. Go before it times out."'
        : cycle(n, [`The monk has said his word, ${nick(s)}. North.`, `Lookin' good, ${nick(s)}. Go in. The session won't last.`, `He points north again, ${nick(s)}, with both hands this time.`])
      : n === 2 ? 'The monk points at the progress bar again, a little harder. It is still starting.'
        : n === 3 ? '"Open it," the monk says, quietly, so the session doesn\'t hear. "Or wait. Either one. It counts your patience, and it counts your hands."'
        : cycle(n, [`Still not opening it, ${nick(s)}. The bar noticed.`, `"OPEN," the monk mouths at you, ${nick(s)}. He has broken his vow for this.`, `Almost there, ${nick(s)}. A hand on the gate, or wait. Talking is neither.`])),
    brushOff: BRUSHOFFS.monk,
    knows: ['session', 'spark', 'spark session', 'progress', 'bar', 'progress bar', 'wait', 'waiting', 'gate', 'door', 'abbot', 'cloister', 'monastery', 'vow', 'silence'],
  }),
  npc({
    id: 'abbot', name: 'the Abbot', aliases: ['abbot', 'father abbot', 'father'],
    describe: (s) => ((s.recent?.n ?? 1) >= 2 ? 'The Abbot looks back. Monks train for years to out-stare people. You trained on Dataflows Gen1.' : 'The Abbot. His robe has a hood. His hood has a flame on it. He has never once used a Dataflow.'),
    talk: (s) => (s.flags['has.hoodie']
      ? '"Go, child. Write notebooks. Never look back."'
      : s.flags['notebook.fixed']
        ? '"Kneel."'
        : '"Brother Pandas has put pandas in the Lakehouse again. Fix his notebook and the Hoodie of Spark is yours."'),
    // With the notebook fixed, talk is the hoodie rule (monastery.hoodie); this covers before and after.
    // With XMLA off he does not send you south through the wall; with no Notebook to be had he names the book, not the scroll command (round 2, N1).
    talkMore: (s, n) => {
      if (s.flags['has.hoodie']) return n === 2 ? '"Notebooks," the Abbot says again. "Write them. Never look back. I am looking back. Do not do as I do."'
        : n === 3 ? (xmlaOff(s)
          ? '"The back gate is a wall, child. XMLA endpoint: Read Write, in the Capacity Ledger upstairs, is off. Turn it on, or go west from the gate through the Gold Marsh, the long way. Then the Peaks. The Worthy Three are worn, smelt, and held. You wear one of them."'
          : '"South, child. Through the Keep, to the Peaks. The Worthy Three are worn, smelt, and held. You wear one of them."')
        : cycle(n, [`"Lookin' good, ${nick(s)}. The hood suits you. It suits everyone. That is the problem with hoods."`, `"Go, ${nick(s)}. The dragon is east of everything."`, `"You are still here, ${nick(s)}. The hoodie is not a chair."`]);
      if (n === 2) return '"Pandas," the Abbot says, with the weariness of a man who has said it at every standup. "In the Lakehouse. Fix the notebook."';
      // Blockers alone (not `noNotebook`): with the notebook fixed the hoodie rule answers instead, so this branch is only ever the broken-notebook case.
      if (notebookBlockers(s).length) {
        if (n === 3) return `"No Notebook until ${notebookBlockerText(s)} back on. The Sacristy, up the stair, has it. Then the scroll, west, in a case; then the notebook, east; then kneel. In that order. I have watched people try other orders."`;
        return s.inventory.includes('scroll')
          ? cycle(n, [`"You have the scroll, ${nick(s)}. The tenant has the notebook. The Sacristy has the tenant. Up."`, `"Almost there, ${nick(s)}. The book first. Then the notebook."`, `"Still holding the scroll, ${nick(s)}? It reads better on a notebook you are allowed to have."`])
          : cycle(n, [`"Still pandas, ${nick(s)}. Still no Fabric items."`, `"Almost there, ${nick(s)}. Up for the book, west for the scroll, east for the notebook."`, `"The Hoodie of Spark waits, ${nick(s)}. So does the Sacristy. One of them is a stair away."`]);
      }
      if (n === 3) return '"The scroll is in the Library, west, in a case. Your license opens the case. Then east, east, use the scroll on the notebook. Then kneel."';
      return s.inventory.includes('scroll')
        ? cycle(n, [`"You have the scroll, ${nick(s)}. East. The chamber. The notebook. Use it."`, `"Almost there, ${nick(s)}. The notebook is one room east and forty-one minutes deep."`, `"Still holding the scroll, ${nick(s)}? It reads better on a notebook."`])
        : cycle(n, [`"Still pandas, ${nick(s)}."`, `"Almost there, ${nick(s)}. West for the scroll, east for the notebook."`, `"The Hoodie of Spark waits, ${nick(s)}. It has waited through worse."`]);
    },
    brushOff: BRUSHOFFS.abbot,
    knows: ['pandas', 'brother pandas', 'brother', 'notebook', 'hoodie', 'hood', 'hoodie of spark', 'spark', 'scroll', 'spark scroll', 'library', 'librarian', 'license', 'lakehouse', 'kneel', 'worthy', 'peaks', 'dragon', 'keep', 'notebooks'],
  }),
  npc({
    id: 'pandas', name: 'Brother Pandas', aliases: ['pandas', 'brother pandas', 'brother', 'monk pandas'],
    describe: (s) => ((s.recent?.n ?? 1) >= 2 ? 'He is even surer now. Production has not been told.' : 'Brother Pandas. He is very sure this will work in production.'),
    // With Fabric items off (tenant or capacity) and his notebook still broken, he cannot make the one thing the chamber
    // is for (spec2 §3.3). Fixed, he has his Notebook whatever the shelf says now, so every talk is the fixed branch.
    talk: (s) => (noNotebook(s) ? '"I can make a report. I can make a dashboard. I cannot make a Notebook. Who did this."' : '"It works on my laptop."'),
    // Talk 3 names the switch that is actually off (review E2 I1): the shelf's book, the Ledger's Delegated one, or both.
    talkMore: (s, n) => (noNotebook(s)
      ? n === 2 ? '"Who did this," Brother Pandas says again. He is looking at you. He has been looking at you the whole time.'
        : n === 3 ? ({
          shelf: '"The Sacristy, up the stair from the Cloister. A book on the shelf says Users can create Fabric items, and somebody shut it. Open it again and I can stop being a report."',
          ledger: '"The Sacristy, up the stair from the Cloister. The Capacity Ledger, on the lectern: Delegated tenant settings. The capacity overrode the tenant. Turn it back on and I can stop being a report."',
          both: '"The Sacristy, up the stair from the Cloister. Users can create Fabric items is shut on the shelf, and the Capacity Ledger says Delegated, also shut. Open both. I will wait. I am good at it."',
        })[pandasSwitch(s)]
        : cycle(n, [`"Still no Notebook, ${nick(s)}. Still a report. It says 1."`, `"Almost there, ${nick(s)}. The Sacristy. ${({ shelf: 'The shelf. Fabric items. On.', ledger: 'The Ledger. Delegated. On.', both: 'The shelf AND the Ledger. On, and on.' })[pandasSwitch(s)]}"`, `"I can make a dashboard, ${nick(s)}. Nobody wants a dashboard. Not even the dashboard."`])
      : s.flags['notebook.fixed']
      ? n === 2 ? '"Four seconds," Brother Pandas says again. He has said it forty times. It is still four seconds.'
        : n === 3 ? '"The Abbot wants you. West. He has a hoodie and he has been holding it at arm\'s length."'
        : cycle(n, [`"Lookin' good, ${nick(s)}. Spark suits you."`, `"Delta," he whispers at you, ${nick(s)}. He's fine. He's just saying it now.`, `"It works in production, ${nick(s)}. I don't know what to do with my hands."`])
      : n === 2 ? '"It works on my laptop," Brother Pandas repeats. "My laptop is not here. That is the problem, or one of them."'
        : n === 3 ? '"pd.read_csv. That\'s the cell. It wants spark.read. There\'s a scroll in the Library that says so. West, west."'
        : cycle(n, [`"Still running, ${nick(s)}. Forty-one minutes. Forty-two."`, `"Almost there, ${nick(s)}. The scroll. On the notebook. I'd do it but I'd do it in pandas."`, `"I could restart the session, ${nick(s)}. I'm not going to. Four minutes."`])),
    brushOff: BRUSHOFFS.pandas,
    knows: ['laptop', 'notebook', 'pandas', 'spark', 'pyspark', 'scroll', 'spark scroll', 'cell', 'session', 'csv', 'read_csv', 'production', 'abbot', 'hoodie', 'lakehouse', 'delta', 'library', 'dataframe'],
  }),
  npc({
    id: 'librarian', name: 'the Librarian', aliases: ['librarian', 'the librarian', 'woman'],
    describe: (s) => ((s.recent?.n ?? 1) >= 2 ? "She looks back at you over glasses she doesn't need. You are now overdue." : 'The Librarian. She has read every deprecated notebook and remembers each one personally.'),
    talk: (s) => (s.flags['scroll.lent']
      ? '"Bring it back by the end of the Spark session."'
      : '"The Spark Scroll? Library card only. Any license will do. Well. Any license we accept."'),
    talkMore: (s, n) => (s.flags['scroll.lent']
      ? n === 2 ? '"By the end of the session," she says again, and the session, somewhere, starts.'
        : n === 3 ? (notebookBlockers(s).length
          ? `"East, then east, the notebook. It will not take the scroll until ${notebookBlockerText(s)} back on; the Sacristy, up the stair, has it. And bring the scroll back, which nobody ever has."`
          : '"East, then east. The notebook. Use the scroll on it. And bring it back, which nobody ever has."')
        : cycle(n, [`"Shh, ${nick(s)}."`, `"Lookin' good, ${nick(s)}. Now read it. Nobody reads them."`, `"You have the scroll, ${nick(s)}. I have your card. This is a library; that's a transaction."`])
      : n === 2 ? '"Library card," she says again. "Any license. Yours. The one in your pocket, which you keep touching."'
        : n === 3 ? '"Give me the license. Say: give license to librarian. I will keep it as collateral. That is what collateral is for."'
        : cycle(n, [`"Still no card, ${nick(s)}. It's in your inventory. I can see it from here."`, `"Almost there, ${nick(s)}. Give. License. Librarian. Three words; I'll allow it."`, `"The scroll is not going to lend itself, ${nick(s)}."`])),
    brushOff: BRUSHOFFS.librarian,
    knows: ['scroll', 'spark scroll', 'pyspark', 'license', 'card', 'library card', 'collateral', 'notebook', 'notebooks', 'session', 'spark session', 'book', 'books', 'case', 'library', 'deprecated'],
  }),
  npc({
    id: 'guard', name: 'the guard', aliases: ['guard', 'guards', 'bridge guard', 'the guard'],
    describe: () => 'A guard in plate mail stamped SKU. He has one job, a very loud voice for it, and a lanyard that says "Capacity Admin (acting)".',
    talk: (s) => (s.flags['bridge.down'] ? '"Sixty days, peasant. Make them count."' : '"HALT! State your SKU!"'),
    // The progress gate of §3.1: the checklist, then the spelled-out hint, then the nickname lines; "Lookin' good" once the bridge is down.
    talkMore: (s, n) => (s.flags['bridge.down']
      ? n === 2 ? '"Sixty days," the guard repeats, slower, holding up six fingers and then, after some thought, a zero.'
        : n === 3 ? '"Sixty. Days. Go in. The hall is north; the Duke is north of that. Stop talking to the guard."'
        : cycle(n, ["'Lookin' good, Mr. Trial.'", `'Still here, ${nick(s)}? The Keep is that way. North. Where the drawbridge fell.'`, `'You have a trial and a Keep, ${nick(s)}. Use one on the other.'`])
      : n === 2 ? '"HALT," the guard says again, quieter, as if halting were something you could do more of. "Your SKU."'
        : n === 3 ? '"A SKU. S-K-U. Trial\'s free, peasant, if you can\'t afford one."'
        : cycle(n, [`'Still no SKU, ${nick(s)}.'`, `'Almost there, ${nick(s)}, but that's PRO.'`, `'Say it or start it, ${nick(s)}. T-R-I-A-L. It's free. That's the joke.'`])),
    brushOff: BRUSHOFFS.guard,
    knows: ['sku', 'skus', 'trial', 'pro', 'premium', 'ppu', 'fabric', 'capacity', 'license', 'bridge', 'drawbridge', 'gate', 'keep', 'splash', 'splash screen', 'desktop', 'days', 'sixty days', 'moat', 'lanyard', 'password'],
  }),
  npc({
    id: 'duke', name: 'the Duke of DAX', aliases: ['duke', 'duke of dax', 'the duke', 'duke of warehouse'],
    describe: () => 'The Duke of DAX on a throne of nested CALCULATEs. He speaks only in filter context. He has never once used SQL and would like that in writing.',
    talk: (s) => (s.flags['trial.moat']
      ? 'The Duke pretends not to see you. You smell like his basement.'
      : "'CALCULATE(,' says the Duke, and waits. He is waiting for your filter argument. He will wait forever."),
    talkMore: (s, n) => (s.flags['trial.moat']
      ? n === 2 ? 'The Duke pretends harder not to see you. It is a skill. He learned it in a design review.'
        : n === 3 ? "'You have your smell,' says the Duke, to the window. 'The Studio is east of the hall. Go stare at something.'"
        : cycle(n, [`'Still here, ${nick(s)}? You smell like my basement and you are standing in my chamber.'`, `'Lookin' good, ${nick(s)}. Awful, but good.'`, `The Duke evaluates you, ${nick(s)}. The result is (Blank).`])
      : n === 2 ? "'CALCULATE(,' says the Duke, slower, and waits. You have brought nothing to put in the parentheses."
        : n === 3 ? "'There is one thing,' says the Duke, 'that I will not hear in this chamber. It has two words. It goes in a table. Say it, and see what happens.'"
        : cycle(n, [`'Still no sin, ${nick(s)}. Say the two words, or hand me a table I can despise.'`, `'Almost there, ${nick(s)}. Not SQL. A modeling shortcut. The lazy one.'`, `'The word is not SQL, ${nick(s)}. Think smaller. Think of a column. Or bring me one with every day in it.'`])),
    brushOff: BRUSHOFFS.duke,
    knows: ['calculate', 'dax', 'filter', 'filter context', 'context', 'measure', 'measures', 'column', 'columns', 'calculated column', 'sin', 'sql', 'table', 'tables', 'window', 'throne', 'moat', 'warehouse', 'studio', 'smell', 'basement'],
  }),
  npc({
    id: 'cardinality', name: 'Sir Cardinality', aliases: ['sir cardinality', 'cardinality', 'knight', 'sir'],
    describe: () => 'A knight with one eyebrow permanently raised. He has seen your relationships.',
    // Talk 1 is advice[0]; the builtin's escalation walks the rest (the Model View no longer has its own talk rule).
    talk: () => CARDINALITY_ADVICE[0]!,
    talkMore: (s, n) => (n === 2 ? CARDINALITY_ADVICE[1]!
      : n === 3 ? (xmlaOff(s)
        ? `${CARDINALITY_ADVICE[2]} He looks toward the north gate, which is bricks. 'The monks are behind that, and XMLA endpoint: Read Write is off; the Capacity Ledger in their Sacristy has it. Or the Gold Marsh, the long way. The Duke is east, then north. Go be humiliated in the correct order.'`
        : `${CARDINALITY_ADVICE[2]} He looks toward the north gate. 'The monks are that way. The Duke is east, then north. Take him the date table; he has opinions. Go be humiliated in the correct order.'`)
      : cycle(n, [`"One. To. Many, ${nick(s)}."`, `"Star schema, ${nick(s)}. I have said it. I will say it at your funeral."`, `"The dragon wants two words, ${nick(s)}. I have given you three. That is the last time I round up."`])),
    brushOff: BRUSHOFFS.cardinality,
    knows: ['cardinality', 'relationship', 'relationships', 'star schema', 'schema', 'star', 'snowflake', 'model', 'one to many', 'many to many', 'bidirectional', 'direction', 'fact', 'fact table', 'dimension', 'dimensions', 'table', 'tables', 'dragon', 'bridge', 'duke', 'monks', 'abbot', 'eyebrow'],
  }),
  npc({
    id: 'card', name: 'the Card visual', aliases: ['card', 'card visual', 'blank', 'the card'],
    describe: (s) => (s.flags['stare.done']
      ? 'It blinks. A number appears: 4.2M. It is wrong, but it is a number.'
      : '(Blank). It shows (Blank). It has always shown (Blank).'),
    talk: (s) => (s.flags['stare.done']
      ? 'The Card says 4.2M. It would like you to stop asking where it got that.'
      : 'The Card says (Blank). It is not being rude. It has no measure.'),
    // The Studio's talk rule (fortress.talk-card) calls talkTo, so this escalation runs there.
    talkMore: (s, n) => (s.flags['stare.done']
      ? n === 2 ? 'The Card says 4.2M again, slightly louder. It has one value and it is committed to it.'
        : n === 3 ? 'The Card shows 4.2M. Beside it, the Big Refresh shows 97%, and beside that, a pie with thirty-one slices. One of those three is the problem, and it is round.'
        : cycle(n, [`(4.2M), ${nick(s)}.`, `The Card looks at you, ${nick(s)}, the way a card looks at anything: with a number.`, `Lookin' good, ${nick(s)}. Lookin' (4.2M).`])
      : n === 2 ? '(Blank). Again. The Card is not stalling; it has nothing to stall with.'
        : n === 3 ? 'The Card shows (Blank). It will show a number if you look at it and do not blink. Blink and it wins.'
        : cycle(n, [`Still (Blank), ${nick(s)}.`, `Almost there, ${nick(s)}. Look at it. Just look.`, `(Blank) is not a conversation, ${nick(s)}. It is a measure that never got written.`])),
    brushOff: BRUSHOFFS.card,
    knows: ['blank', 'measure', 'measures', 'number', 'value', '4.2m', 'refresh', 'big refresh', 'policy', 'incremental', 'stare', 'staring', 'wait', 'visual', 'report', 'pie', 'pie chart', 'bar chart'],
  }),
  npc({
    id: 'throttlor', name: 'Throttlor', aliases: ['dragon', 'throttlor the capacity dragon', 'capacity dragon', 'the dragon'],
    hiddenWhen: (s) => !!s.flags['dragon.gone'],
    // The flood makes him bigger (spec2 §3.5); Surge protection gives him a hat and nothing else (spec2 §3.4).
    // A second look in a row gets the short one (Task F8).
    describe: (s) => ((s.recent?.n ?? 1) >= 2
      ? 'Still THROTTLOR. The smoke keeps its 30-second schedule, which is more than your refreshes ever managed.'
      : `${isFlood(s) ? 'Throttlor is enormous today. The whole organization is refreshing at once. ' : ''}THROTTLOR, the Capacity Dragon. Smoke rises from his nostrils in neat 30-second intervals. His scales are the color of a red status bar.${setting(s, 'surge') ? ' He is wearing a hard hat. Surge protection.' : ''}`),
    talk: () => '"WHO DARES— oh. Oh no. You smell like a Warehouse." The dragon gags. "Answer me this, peasant: WHAT IS THE ONE TRUE MODEL?"',
    // The Shrine's talk rule (peaks.talk-dragon) calls talkTo, so this runs there; he is gone (hidden) after the answer.
    talkMore: (s, n) => (n === 2 ? '"WHAT IS THE ONE TRUE MODEL," Throttlor repeats, slower, with more smoke. He does not like repeating himself. He is billing you for it.'
      : n === 3 ? '"Two words, peasant. One fact table. Some dimensions. A shape. Sir Cardinality said it three times; I heard him from here."'
      : cycle(n, [`"Still no answer, ${nick(s)}. The question has not changed. Neither has the fee."`, `"Almost there, ${nick(s)}. It's a schema. It's shaped like a thing in the sky."`, `Throttlor yawns fire at you, ${nick(s)}. "Answer, or I start smoothing you over 24 hours."`])),
    // After any talk, the Shrine's peaks.dragon-brushoff varies this line by the talk count (Task F8).
    brushOff: BRUSHOFFS.throttlor,
    // "capacity" is deliberately not here: he bills for that one.
    knows: ['model', 'one true model', 'semantic model', 'golden semantic model', 'star schema', 'schema', 'star', 'snowflake', 'fact table', 'fact', 'dimension', 'dimensions', 'answer', 'question', 'kimball', 'cardinality', 'warehouse'],
  }),
  npc({
    id: 'scarecrow', name: 'Manual', aliases: ['manual', 'scarecrow', 'scarecrow named manual'],
    // The day behind death.monday (fix round 1): the sign is the warning.
    // The backstory beat (Task F4): you were one too, once, and you formatted it. A second look in a row gets the short one.
    describe: (s) => ((s.recent?.n ?? 1) >= 2
      ? 'Still straw. Still Monday.'
      : 'A scarecrow named Manual. He keeps the birds off the refreshes. He has to be triggered by hand. Around his neck, a sign: MONDAY. Not a surname. A warning, about full refreshes, from someone who has seen one. You were a scarecrow once, in a school play. You formatted the programme.'),
    talk: () => 'Manual says nothing. He is waiting for someone to click him.',
    talkMore: (s, n) => (n === 2 ? 'Manual says nothing, again. He is very consistent for a scarecrow that has to be triggered by hand.'
      : n === 3 ? 'Manual says nothing. You could use him; he refreshes when clicked. That is his whole thing and his whole tragedy.'
      : cycle(n, [`Manual, ${nick(s)}, is a scarecrow. He is not going to open up.`, `Nothing, ${nick(s)}. Not even a schedule.`, `Manual waits, ${nick(s)}. Manual is good at that. It's in the name.`])),
    brushOff: BRUSHOFFS.scarecrow,
    knows: ['refresh', 'refreshes', 'schedule', 'scheduled', 'trigger', 'click', 'clicking', 'birds', 'crows', 'fields', 'manual', 'straw', 'hand'],
  }),
  npc({
    id: 'jeff-excel', name: 'Jeff', aliases: ['jeff', 'jeff from finance', 'finance'],
    describe: () => 'Jeff, at his desk, two monitors, one of them turned away. He has the face of a man who has already decided.',
    // Sheet1's rules answer talk/ask/show first (excel.ask-jeff carries its own stage-and-repeat variants; an `about`
    // topic he doesn't know is his brush-off, excel.ask-jeff-unknown). This is the fallback for any path that reaches the
    // builtin. No talkMore: the engine must not escalate him a second time.
    talk: (s) => (s.flags['sq.excel.done']
      ? '"Okay. The report was right. Don\'t tell anyone I said that."'
      : '"The report says 4.2M. My export says 4.7M. One of them is lying and I\'ve decided it\'s the report."'),
    brushOff: BRUSHOFFS['jeff-excel'],
    knows: ['excel', 'export', 'report', 'pivot', 'pivottable', 'pivot table', 'data', 'data tab', 'tab', 'analyze', 'analyze in excel', 'sign in', 'signin', 'connect', 'connection', 'model', 'net sales', 'sales', 'sales region', 'region', 'year', 'filter', 'filters', 'numbers', 'number', 'total', 'sum', '4.2m', '4.7m', 'field', 'fields', 'monitor', 'ribbon', 'sheet1', 'sheet', 'finance', 'certified', 'it', 'result', 'results', 'answer', 'badge', 'csv'],
  }),
  // The Town Hall's Clerk (spec2 §6) lives in world/townhall.ts with his room.
  npc(CLERK_NPC),
]);
