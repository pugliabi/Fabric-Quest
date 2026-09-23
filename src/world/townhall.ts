import type { GameState } from '../engine/types';
import type { Npc, PhraseRule, Room } from './types';
import { BRUSHOFFS } from './voice';

/**
 * The Town Hall (spec2 §6): up the steps from the Village Square. Nothing here scores. The Clerk has one sentence and
 * says it to everything; the fourth talk lets slip where the admins actually are (the Sacristy). The comedic front
 * door to the governance rooms.
 */
export const HALL = 'village.hall';
const SQUARE = 'village.square';
const CLERK = ['clerk', 'admin', 'receptionist', 'the clerk'];
const TICKET = ['ticket', 'support ticket', 'sev-3', 'sev 3', 'the ticket'];
const BELL_LINE = "The clerk looks up. 'That's an admin setting.'";

/** After the escalation, every clerk line (and the bell) carries the status. It never changes. That is the status. */
const progress = (s: GameState): string => (s.flags['hall.ticket'] ? ' Your ticket is still In Progress.' : '');
const bell = (s: GameState): string => `${BELL_LINE}${progress(s)}`;
/** The same line again, in a row (the voice sweep, Task F11): read off `recent`, so no flag moves. */
const again = (s: GameState, first: string, second: string): string => ((s.recent?.n ?? 1) >= 2 ? second : first);
/**
 * Your ticket, asked after (Task F11): the Clerk's one derailment. Before it is filed it is already In Progress; after,
 * you get as far as a name, and the name is the sentence.
 */
const ticketTalk = (s: GameState): string => (s.flags['hall.ticket']
  ? "'Who's working my ticket?' you ask. 'In Progress,' says the Clerk."
  : "'That ticket's on the counter,' says the Clerk. 'It's In Progress.' You haven't filed it.");
const ticketStatus = (s: GameState): string => (s.flags['hall.ticket']
  ? again(s, 'You check your ticket: In Progress. You refresh it: In Progress, with a newer timestamp. That is what progress looks like.', 'Still In Progress. Only the timestamp moves.')
  : "The ticket is on the counter and it isn't filed. Its status is In Progress anyway. It came that way.");

/**
 * Talk 5 and up walk four lines by talk number, not by turn (the npc-talk harness holds the turn fixed and asks that
 * talk n never repeat talk n-1; a turn-keyed rotate would). Same shape as the other NPCs' 4+ cycle in npcs.ts.
 */
const LATER = [
  "That's an admin setting.",
  'That would be an admin setting.',
  'Admin setting. Next.',
  '…the admins are in the Sacristy, up the stair from the Cloister. I said that already.',
] as const;
const later = (n: number): string => LATER[(((n - 5) % LATER.length) + LATER.length) % LATER.length]!;

export const CLERK_NPC: Npc = {
  id: 'clerk', name: 'the Clerk', aliases: CLERK,
  describe: () => 'The Clerk. A cardigan, a counter, a stamp that says ADMIN SETTING. The stamp is worn smooth.',
  talk: (s) => `That's an admin setting.${progress(s)}`,
  talkMore: (s, n) => (n === 2 ? `That would be an admin setting.${progress(s)}`
    : n === 3 ? `Admin setting. Next.${progress(s)}`
    : n === 4 ? `…the admins are at the Monastery. In the Sacristy, up the stair from the Cloister. They do not answer tickets.${progress(s)}`
    : `${later(n)}${progress(s)}`),
  // No `knows`: one sentence, forever. Every topic is an admin setting.
  brushOff: BRUSHOFFS.clerk!,
};

export const HALL_ROOM: Room = {
  id: HALL, name: 'Town Hall', region: 'village',
  enterQuip: () => 'Take a number. There is one number. It is 1.',
  describe: () => 'The Town Hall. A counter, a Clerk behind it, a bell, a poster in a frame, and a queue rope with nobody in it. The square is down the steps.',
  exits: { d: SQUARE, out: SQUARE },
  items: ['ticket', 'bell', 'poster', 'rope', 'counter'],
  npcs: ['clerk'],
  scene: () => HALL,
  flaskHint: () => 'Nothing to win here. The clerk will tell you where the admins are if you keep talking.',
  rules: [
    // The voice sweep (Task F11): the Clerk has heard of the Sacristy. He has not been. Ahead of everything, since it is a talk.
    { id: 'hall.clerk-sacristy', when: { verb: 'talk', noun: CLERK, noun2: ['sacristy', 'the sacristy', 'admins', 'the admins', 'monastery'] }, then: { text: "'The Sacristy,' says the Clerk. 'Up from the Cloister. I've never been. I put in a ticket to go.'", outcome: 'success' } },
    { id: 'hall.clerk-ticket', when: { verb: 'talk', noun: CLERK, noun2: [...TICKET, 'my ticket', 'status'] }, then: { text: ticketTalk, outcome: 'snark' } },
    { id: 'hall.give-ticket', when: { verb: 'give', noun: TICKET, noun2: CLERK, has: ['ticket'] }, then: { text: 'Your ticket has been escalated. Estimated response: three business dragons.', remove: ['ticket'], set: { 'hall.ticket': true }, outcome: 'success', sfx: 'success' } },
    // The ticket still on the counter: the plan is right, the hand is empty (skill: missing prerequisite). Only while it is there.
    { id: 'hall.give-ticket-counter', when: { verb: 'give', noun: TICKET, noun2: CLERK, notHas: ['ticket'], flags: [{ flag: 'taken.ticket', not: true }] }, then: { text: "Pick it up first; it's on the Clerk's side of the counter. Then it's your problem, and you can make it his.", outcome: 'fail' } },
    { id: 'hall.give-anything', when: { verb: 'give', noun2: CLERK }, then: { text: "That's an admin setting.", outcome: 'fail' } },
    { id: 'hall.say', when: { verb: 'say' }, then: { text: "Noted. That's an admin setting.", outcome: 'snark' } },
    { id: 'hall.bell', when: { verb: 'use', noun: ['bell', 'desk bell', 'service bell'] }, then: { text: bell, outcome: 'fail' } },
    { id: 'hall.poster', when: { verb: 'read', noun: ['poster', 'frame', 'sign', 'framed poster'] }, then: { text: 'TENANT SETTINGS ARE NOT A SECURITY MEASURE. — the Learn docs, on the wall, in a frame.', outcome: 'success' } },
    { id: 'hall.rope', when: { verb: 'use', noun: ['rope', 'queue rope', 'queue', 'stanchion'] }, then: { text: 'You unclip the rope and clip it back. The queue is unchanged: you.', outcome: 'fail' } },
    { id: 'hall.counter', when: { verb: 'use', noun: ['counter', 'desk', 'front desk'] }, then: { text: 'The Clerk slides a form across the counter. It is blank. That is the form.', outcome: 'fail' } },
  ],
};

/** The steps, in words: "climb the steps", "up the steps", "take the stairs"; with an optional "to the town hall" on the end. */
const STEPS = /^((climb|take|go|walk|head|ascend|descend)( up| down)?( the)? (steps?|stairs?|staircase)|(go |walk |head |climb )?(upstairs|downstairs)|(up|down)( the)? (steps?|stairs?))( (to|into)( the)? (town ?hall|hall|square))?$/;
const ENTER = /^(enter|visit|go (in|into|inside|to|up to)|walk (in|into|to)|head (in|into|to))( the)? (town ?hall|hall)$/;
const LEAVE = /^(leave|exit|quit)( the)? (town ?hall|hall)$/;

/** Room-scoped; registered right after SACRISTY_PHRASES (world/index.ts). The Square's copy beats the global egg.climb. */
export const TOWNHALL_PHRASES: PhraseRule[] = [
  { id: 'hall.ring', room: HALL, test: /^(ring|ding|hit|tap|press|slap|smack)( the)?( (desk|service))? bell$|^ring$/, text: bell },
  // The steps from both ends. In the Square they only go up; in the Hall they only go down. Either way you take them.
  { id: 'hall.steps-up', room: SQUARE, test: STEPS, text: '', then: (_s, _w, line) => ({ then: { text: /\b(down|downstairs|descend)\b/.test(line) ? 'The steps go up from here. Down is the Square, and you are standing on it. You take the steps up.' : 'You take the steps up. There are four. It felt like more.', moveTo: HALL } }) },
  { id: 'hall.enter', room: SQUARE, test: ENTER, text: '', then: { text: 'You take the steps up. There are four. It felt like more.', moveTo: HALL } },
  { id: 'hall.steps-down', room: HALL, test: STEPS, text: '', then: (_s, _w, line) => ({ then: { text: /\b(up|upstairs|ascend)\b/.test(line) ? 'The steps go down from here. Up is a ceiling. You take the steps down.' : 'You take the steps down. Four again. Consistency is the only thing this building offers.', moveTo: SQUARE } }) },
  { id: 'hall.leave', room: HALL, test: LEAVE, text: '', then: { text: 'You take the steps down. Four again. Consistency is the only thing this building offers.', moveTo: SQUARE } },
  // The voice sweep (Task F11): the number, the counter, the status. The verbs the parser has no word for.
  { id: 'hall.take-number', room: HALL, test: /^(take|get|pull|grab)( a)? number$/, text: (s) => again(s, 'You take a number. It is 1. The Clerk calls 1. It is an admin setting.', 'You take another number. Also 1. Now you have it twice, like a duplicate ticket.') },
  { id: 'hall.climb-counter', room: HALL, test: /^(climb|jump|vault|hop)( over| on| onto)?( the)? counter$/, text: "You climb the counter. The Clerk does not look up. 'That's an admin setting.' It is." },
  { id: 'hall.ticket-status', room: HALL, test: /^((check|refresh|track|follow up on)( the| my)? ticket( status)?|(the |my )?ticket status|status)$/, text: ticketStatus },
];
