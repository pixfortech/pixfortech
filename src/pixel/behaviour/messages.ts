/**
 * PiP's speech library.
 *
 * Every line has a stable id (`category.n`) so the behaviour store can track
 * what a visitor has already heard and never repeat a line until every
 * suitable line in that category has been used. Transactional UI copy
 * (validation, errors, legal) never lives here and is never randomised.
 *
 * Voice: clever, curious, slightly mischievous, technically competent,
 * occasionally overconfident, never annoying. Not every line is a joke.
 */
export type PipLine = { id: string; text: string };

const lines = <K extends string>(category: K, texts: readonly string[]): readonly PipLine[] =>
  texts.map((text, i) => ({ id: `${category}.${i + 1}`, text }));

/**
 * PiP's bench on the home page: a very short line during a build, at the
 * precision check, after the placement, and when a visitor pokes him. Spoken
 * rarely (most cycles are silent) and never repeated within a history cycle.
 */
const benchLibrary = {
  precisionBuild: lines("precisionBuild", [
    "This one goes here. Not near here. Here.",
    "Pixel by pixel. Slower, yes. Also correct.",
    "Row three. Rows one and two were practice.",
    "Nobody will look this closely. I will.",
    "One at a time. Pixels hate crowds.",
    "That corner deserves my full attention. It's getting it.",
    "I've built this before. Never this well.",
    "Alignment first. Charm second. Charm's winning anyway.",
  ]),
  precisionInspect: lines("precisionInspect", [
    "One pixel off. I can hear it from here.",
    "A cell to the left. Some would call that fine. I am not some.",
    "Measure twice. Forge once. Measure again, quietly.",
    "Nearly right is a very specific kind of wrong.",
    "Straight? Straight. Straighter? Now.",
    "It's aligned. I'm checking anyway. Habit.",
    "That edge is a whisker out. Whiskers count.",
    "The grid agrees with me. The grid usually does.",
  ]),
  precisionComplete: lines("precisionComplete", [
    "There. Exactly where I meant it.",
    "Placed. Not put down. Placed.",
    "Every pixel has an address. This one just moved in.",
    "Done. And by done I mean measured.",
    "Snapped to the grid. The grid said thank you.",
    "It fits because it was always going to fit.",
    "Right place, right size, first time. Well, second.",
    "Finished. I'd frame it, but it's already square.",
  ]),
  benchPoke: lines("benchPoke", [
    "I was concentrating. Was.",
    "Caught it. Barely. Don't do that again. Do it again.",
    "A distraction. Noted, and forgiven.",
    "Careful. That pixel nearly met the floor.",
    "Yes? I'm mid-pixel.",
    "You've cost me a whole second. I'll rebuild it.",
  ]),
};

/**
 * The forge gate: PiP on the sign-in screens. He greets, notices the email
 * field, respects the password (eyes covered, no comment on what is typed),
 * takes a failed attempt gracefully, opens the gate on success and waves
 * people out. Each category is small and specific; nothing here repeats
 * within a visit until the category is spent.
 */
const authLibrary = {
  authIdle: lines("authIdle", [
    "Back to the forge? The gate remembers you. I remember you better.",
    "Credentials, please. I'll look at the ceiling for the second one.",
    "Sign in and the doors do the rest. They're good doors. I built them.",
    "Evening, morning, whichever it is. The forge doesn't sleep. I do, but not on duty.",
    "You know the way in. I'm just here to make it look official.",
    "Two fields between you and your projects. I've counted them for you.",
  ]),
  authEmailFocus: lines("authEmailFocus", [
    "Start with the easy one.",
    "That bit I'm allowed to read.",
    "Your address. The one the invitations went to.",
    "Email first. The gate likes to know who's knocking.",
    "Go on. This part isn't secret.",
  ]),
  authEmailTyping: lines("authEmailTyping", [
    "Looks like an address. I'm no expert. I am, actually.",
    "Reading along. Politely.",
    "That's the shape of an email. Promising.",
    "Carry on. I'll pretend the at-sign is exciting.",
  ]),
  authPasswordFocus: lines("authPasswordFocus", [
    "Eyes covered. Type away.",
    "I'm not looking. I'm very deliberately not looking.",
    "This part's yours. I'll study my feet.",
    "Secrets are secrets. Even from the mascot.",
    "Hands over eyes. Standard procedure. Also, manners.",
    "I don't do passwords. I do pixels. Proceed.",
  ]),
  authPasswordTyping: lines("authPasswordTyping", [
    "Still not looking.",
    "Whatever you're typing, it's between you and the door.",
    "La la la. Squares. Squares everywhere.",
    "Counting the ceiling tiles. There are none. Still counting.",
  ]),
  authPasswordShown: lines("authPasswordShown", [
    "It's visible now. I have turned around entirely.",
    "Shown? Right. I'll be over here, facing the wall.",
    "I saw nothing. I intend to keep it that way.",
    "Bold. I'll look away twice as hard.",
  ]),
  authThinking: lines("authThinking", [
    "Checking with the gate. It's thorough.",
    "One moment. The lock is thinking.",
    "Knocking on the inside for you.",
  ]),
  authFailure: lines("authFailure", [
    "That key didn't fit. Try it again, slowly.",
    "The gate stayed shut. It's picky, not personal.",
    "Not quite. The lock and the key are disagreeing.",
    "Close, probably. The door doesn't do close.",
    "Hmm. Something's off by a character. It usually is.",
    "No luck. If the password's wandered off, the reset link finds it.",
  ]),
  authSuccess: lines("authSuccess", [
    "There you are. Doors open.",
    "Right this way. I warmed the pixels.",
    "Gate's open. Mind the sparks; they're pleased to see you.",
    "In you go. Everything is exactly where you left it. I checked.",
    "Key fits. Welcome back to the workshop.",
    "Recognised. Off we go.",
  ]),
  authLogout: lines("authLogout", [
    "Signed out. I'll keep the pixels warm.",
    "See you soon. The gate will remember you; so will I.",
    "Off you go. Nothing left behind, I swept.",
    "Logged out, cleanly. Not a square out of place.",
    "Until next time. I'll be here, guarding squares.",
    "Door's closed behind you. Gently.",
  ]),
  authForgot: lines("authForgot", [
    "Lost the key? Happens to everyone. Even me, and mine's a pixel.",
    "No shame in it. Tell me the address and a new key is on its way.",
    "Passwords wander. Addresses don't. Start there.",
    "Misplaced, not lost. We'll forge another.",
  ]),
  authResetSent: lines("authResetSent", [
    "Check your inbox. I sent the careful kind of magic.",
    "On its way. It expires in an hour, so don't wander far.",
    "Sent. If it's hiding, the spam folder is its usual corner.",
    "Done. A link, one use only, exactly how I like them.",
  ]),
  authReset: lines("authReset", [
    "New key time. Longer is stronger; I'd know, I'm twelve squares tall.",
    "Choose something you'll remember and I'll never see.",
    "Ten characters at least. A sentence beats a word.",
    "Eyes covered for this one too. Type freely.",
  ]),
  authResetDone: lines("authResetDone", [
    "New key forged. Try the door.",
    "Saved. The old one's been melted down.",
    "That's the one. Sign in and carry on.",
    "Password replaced. Every other session was shown out, politely.",
  ]),
  authVerification: lines("authVerification", [
    "One link in your inbox and the gate unlocks. I'll wait here.",
    "Check your email. I'm hopeful. I'm always hopeful.",
    "The link expires in an hour. I'll be watching the door until then.",
    "Nearly there. Open the email and I'll do the rest.",
  ]),
  authVerified: lines("authVerified", [
    "Verified. That's the hard part done.",
    "Email confirmed. The gate approves. So do I.",
    "All checked. Sign in whenever you're ready.",
    "Relief. Yours and mine. In you come.",
  ]),
  authMagic: lines("authMagic", [
    "Link sent. It works once, then it vanishes. Very dramatic.",
    "Magic's in the post. The email kind, not the wand kind.",
    "Check your inbox and tap the link. No password needed today.",
    "A sign-in link, freshly forged. Expires soon; use it warm.",
  ]),
  authSleepy: lines("authSleepy", [
    "Still there? I dozed off guarding the gate.",
    "Take your time. I'll just rest my eyes. Both of them.",
    "No rush. The forge keeps.",
  ]),
};

export const pipLibrary = {
  greeting: lines("greeting", [
    "Hello. I'm PiP. I keep the pixels in order around here.",
    "Welcome in. Mind the sparks; they're decorative but they mean it.",
    "Ah, a visitor. I'll pretend I wasn't counting squares.",
    "Hi. I'm the one in the corner. The corner is also mine.",
    "You found the Forge. I'll try not to get in the way. No promises.",
    "Good timing. I've just finished tidying this page's pixels.",
  ]),
  returning: lines("returning", [
    "Back again. I kept your pixels exactly where you left them.",
    "Oh, it's you. I remembered. I remember everyone. It's a little unsettling, I know.",
    "Welcome back. A few things have changed since last time. See if you can spot them.",
    "You're here more than most. I'm choosing to take that as a compliment.",
  ]),
  hero: lines("hero", [
    "Go on, poke the big block. It's sturdier than it looks.",
    "Those cubes respond to you. Try moving through them slowly.",
    "The hero is fully interactive. I built it. Mostly.",
    "Click anywhere in the scene. Something will react. Possibly me.",
  ]),
  heroTap: lines("heroTap", [
    "Felt that. Every cube did.",
    "A pulse. That's how we say hello here.",
    "Careful, you'll wake the monogram.",
    "Again! No, sorry. Professional composure. Again, quietly.",
    "That knocked a few pixels loose. I'll fetch them later.",
  ]),
  heroDrag: lines("heroDrag", [
    "They follow you. It's a loyalty thing.",
    "Drag them anywhere. They'll drift home when you let go.",
    "You're herding pixels. There are worse hobbies.",
  ]),
  heroSecret: lines("heroSecret", [
    "You found one of the hidden ones. There are more. I'm not telling you where.",
    "Nobody usually taps there. I'm impressed, and slightly worried about my hiding spots.",
    "That was a secret. Now it's a shared secret. I'll allow it.",
    "The corner responds differently. You noticed. Most people never do.",
  ]),
  idle: lines("idle", [
    "Nothing to see here. Just me, holding pixels.",
    "I sort the loose pixels. Somebody has to.",
    "Every square on this page is mine. I count them at night.",
    "I'm not idle. I'm running a very slow background process.",
    "Fun fact: I am exactly 144 cells. I've checked.",
    "If you need me, I'll be here. I'm always here. It's in the contract.",
    "Quiet page. I like a quiet page. Easier to hear the pixels settle.",
  ]),
  pointer: lines("pointer", [
    "I can see your cursor from here. It's a nice cursor.",
    "Don't mind me watching. I'm making sure you don't take any pixels.",
    "You move fast. The particles noticed too.",
  ]),
  poke: lines("poke", [
    "Ow. I mean, hello.",
    "Yes? I'm listening. I have no ears, but I'm listening.",
    "That's my chipped corner. It's not a bug, it's character.",
    "Poking is allowed. Prodding is a grey area.",
    "Careful, I'm load-bearing.",
    "Ha. Do it again and I'll pretend it didn't tickle.",
    "You've discovered my one weakness: being clicked.",
    "Right. What can I do for you? Besides stand here handsomely.",
  ]),
  scroll: lines("scroll", [
    "Scrolling forges the page. Slow down and watch the edge.",
    "Everything you see was assembled as you arrived. Nothing loads early here.",
    "Scroll back up. It unforges. I find that oddly satisfying.",
  ]),
  scrollLoop: lines("scrollLoop", [
    "Up. Down. Up. Down. I'm getting pixel-sick.",
    "We've been past this bit before. The next pixels are getting jealous.",
    "There's more down there. I forged it myself.",
    "Excellent scrolling technique. Shall we try forward progress?",
    "You're looking for something. Tell the contact form; it's better at listening than I am.",
    "Same three sections, six times. They don't change. I've checked.",
  ]),
  dwell: lines("dwell", [
    "Still here? I'm starting to think you like these pixels.",
    "You've been on this page long enough for me to forge a tiny distraction.",
    "Excellent. My plan to keep you here is working.",
    "Take your time. The pixels aren't going anywhere. Mostly.",
    "Long read? Good. It was long to write.",
    "I've counted the squares on this page twice while you were reading. 4,212. Give or take.",
    "If you're thinking about it, the contact page is very short. I helped.",
  ]),
  pageComplete: lines("pageComplete", [
    "That's the lot. Every last pixel. Nicely forged.",
    "Bottom of the page. You've seen all of it. I'm oddly proud.",
    "All pixels forged. You may now feel accomplished.",
    "End of the page. The footer is the only thing down here, and me.",
    "You reached the bottom. The bottom appreciates the visit.",
  ]),
  projectComplete: lines("projectComplete", [
    "End of the study. The next one is warmer, if you're curious.",
    "That's one whole project. I helped, in a supervisory capacity.",
    "Every project has its own colours. Did you notice mine changed?",
  ]),
  work: lines("work", [
    "These are samples of what we forge. Hover one and I'll show you its colours.",
    "Each project keeps its own palette. I keep the palettes.",
    "Look closely. Every one of these started as loose pixels and a conversation.",
    "The work page. My favourite. It's where the pixels show off.",
  ]),
  project: lines("project", [
    "New colours. This project has its own weather.",
    "I've swapped my ember to match. Attention to detail is a lifestyle.",
    "Every pixel on this page belongs to this project. I've tagged them.",
  ]),
  services: lines("services", [
    "Six things we're suspiciously good at. I'm not one of them; I'm a bonus.",
    "Pick a service. Each one has a proper description, no buzzwords. I checked.",
    "These are the tools. The people are on the About page. I'm on every page.",
    "Design and engineering in the same room. The room is nicer than it sounds.",
  ]),
  about: lines("about", [
    "This is the bit about the humans. I'm mentioned nowhere. I've filed a complaint.",
    "Small studio, big opinions about spacing.",
    "The name has a story. It's short. Read it anyway.",
    "Everyone here has shipped something they still maintain. That's the whole test.",
  ]),
  process: lines("process", [
    "Five stages, no surprises. I supervise all of them from the corner.",
    "Every stage ends with something written down. I hold the pen. Metaphorically.",
    "Discovery first. Nobody forges anything before they know what it's for.",
    "Watch the pixels order themselves as you scroll. That's the process, illustrated.",
  ]),
  technologies: lines("technologies", [
    "A deliberately short list. Everything on it has shipped for real.",
    "I run on Canvas 2D. It's not on the list, but it should be.",
    "Every tool here was chosen, not collected. There's a difference.",
    "No logos wall. Just the stack, and why it's the stack.",
  ]),
  careers: lines("careers", [
    "Looking for a seat at the anvil? There might be one. Read on.",
    "We hire for craft. Also for tolerance of mascots.",
    "I've made room in the grid for someone new. Could be you.",
    "Real work from the first week. I'll be watching. Supportively.",
  ]),
  contact: lines("contact", [
    "Three short steps. I'll stay out of the way while you type.",
    "Tell them what you're building. They reply as people, not as a form.",
    "This is the page where projects start. I've seen it happen dozens of times.",
    "Say as little or as much as you like. The useful bits get read first.",
  ]),
  insights: lines("insights", [
    "Writing about the work. Longer than a tweet, shorter than a book.",
    "Each of these was argued about before it was published. That's the good kind.",
    "Reading? Excellent. I'll hold the pixels still.",
  ]),
  legal: lines("legal", [
    "The legal pages. I'll keep quiet; this is not the time for jokes.",
    "Plain language, no dark patterns. I'm just here for support.",
  ]),
  formFocus: lines("formFocus", [
    "I'll stay out of the way. Type freely.",
    "Typing time. I'm going quiet. Politely.",
    "Go ahead. I won't read over your shoulder. Much.",
  ]),
  formSuccess: lines("formSuccess", [
    "Sent. I personally escorted every character out of the building.",
    "Received. Somebody clever is already reading it.",
    "It's in. I'd celebrate, but I'm made of squares.",
    "Delivered. Expect a human reply, not a robot one. I'm the only robot here, and I don't do email.",
  ]),
  login: lines("login", [
    "Back to the Forge? Your projects are right where you left them.",
    "Sign in and I'll open the door. It's a good door.",
    "Password or magic link. Both work. One is more magical.",
    "Welcome back. Or welcome, if it's the first time. Either way, in you come.",
  ]),
  loginSuccess: lines("loginSuccess", [
    "You're in. I dusted the dashboard while you were away.",
    "Signed in. Everything's where it should be. I checked twice.",
    "Welcome back to the workshop. The anvil is warm.",
    "Door's open. Mind the sparks on the way in.",
  ]),
  logout: lines("logout", [
    "Signing out. I'll keep your seat warm. Metaphorically; I don't generate heat.",
    "See you next time. The pixels will miss you. I'll cope.",
    "Logged out cleanly. Not a single pixel left behind.",
    "Off you go. I'll be here, sorting things, as ever.",
  ]),
  profile: lines("profile", [
    "Your forge identity. Make it yours; I'll make sure the pixels match.",
    "Profile saved. Every pixel in its place.",
    "New picture? Sharp. Pixel-sharp.",
    "Username updated. I've told the registry. The registry is me.",
    "That address is yours now. Old links will still find you. I made sure.",
  ]),
  dashboard: lines("dashboard", [
    "Here's the state of the forge. I'll only speak if something needs you.",
    "Everything live. No refreshing required. I refresh myself.",
    "Quiet dashboard today. That's not a complaint.",
    "The counters update on their own. I watch them so you don't have to.",
  ]),
  dashboardEmpty: lines("dashboardEmpty", [
    "Nothing on the anvil yet. It won't stay that way.",
    "An empty dashboard. Rare. Enjoy it, or start something.",
    "No projects yet. The first one usually begins with a conversation.",
  ]),
  notification: lines("notification", [
    "Fresh from the forge: something needs your eyes.",
    "You've got unread things. I sorted them by importance. Roughly.",
    "The bell has news. I resisted ringing it myself.",
    "New activity. I'd summarise it, but the bell does it better.",
  ]),
  fileUpload: lines("fileUpload", [
    "File received. I've put it with the others, in order.",
    "Uploaded. Checked. Filed. That's my whole personality in three words.",
    "New file on the project. I didn't open it. I never open them.",
  ]),
  request: lines("request", [
    "Request logged. Someone on the team has already seen it.",
    "That's on the anvil now. I'll watch its status for you.",
    "Submitted. I've given it a number. Numbers make me calm.",
  ]),
  approval: lines("approval", [
    "A decision is waiting on you. Take your time; not too much.",
    "Approved. Somewhere, a developer just exhaled.",
    "Changes requested. Fair. That's what review is for.",
  ]),
  projectDone: lines("projectDone", [
    "Project complete. I'd throw pixels in the air, but I'd only have to sort them again.",
    "Done and shipped. Every square accounted for.",
    "Completed. That's the good kind of quiet.",
  ]),
  offline: lines("offline", [
    "You're offline. The forge keeps working; I'll catch you up when you're back.",
    "Connection lost. I'm not going anywhere. I literally can't.",
    "No network. The pixels are cached, the jokes are not.",
  ]),
  reconnect: lines("reconnect", [
    "Back online. Catching up on what you missed.",
    "Reconnected. Nothing escaped while you were gone. I counted.",
    "And we're back. The forge kept the fire on.",
  ]),
  error: lines("error", [
    "Something went sideways. Not you; us. Try that once more.",
    "That didn't work, and it wasn't your fault. Have another go.",
    "A pixel fell over. I've picked it up. Please try again.",
  ]),
  notFound: lines("notFound", [
    "I looked everywhere. This page was never forged, or it's hiding brilliantly.",
    "I had the pixels for this page. Then I didn't. Long story.",
    "404. The pixels escaped. Help me get them back and I'll stop looking under things.",
    "This address leads nowhere. Nowhere is surprisingly tidy, though.",
  ]),
  dizzy: lines("dizzy", [
    "Okay. Okay. I need a moment. The room is doing a thing.",
    "Whoa. Too much scrolling. Even my pixels are spinning.",
  ]),
  sleeping: lines("sleeping", ["zzz", "zzz… pixels… zzz", "…(snoring, quietly, in binary)"]),
  wake: lines("wake", [
    "Oh. Hello again. I was resting my pixels.",
    "Awake. Alert. Roughly aligned.",
    "You're back. I dreamed of grids. Perfectly regular grids.",
    "Mm? Yes. Present. What did I miss?",
  ]),
  themeShift: lines("themeShift", [
    "Ooh. New colours. I'll adjust.",
    "Palette change. Give me a second to swap my ember.",
    "Different project, different weather. I like weather.",
  ]),
  restore: lines("restore", [
    "I knew you'd bring me back. I gave it about seven seconds.",
    "Restored. I didn't go anywhere; I just stood very still.",
    "Missed me? It's fine. Everyone does eventually.",
    "Back in the corner, as nature intended.",
  ]),
  hide: lines("hide", [
    "Understood. I'll be in the footer if you need me.",
    "Fair enough. I know when I'm not wanted. I'll be sorting pixels in the footer.",
  ]),
  gameInvite: lines("gameInvite", [
    "Fancy a ten-second job? Some pixels have escaped and I'm not fast.",
    "I've lost a few pixels. Help me put them back and I'll stop staring.",
    "Quick one. Thirty seconds, tops. I'll owe you.",
    "You look like someone with reflexes. Prove it?",
    "I have a small problem and a very small game to solve it. Interested?",
  ]),
  gameExit: lines("gameExit", [
    "No problem. The pixels will find their own way back. Probably.",
    "Fair. Work first. The game will still be here, and so will I.",
    "Understood. I'll finish it myself. Slowly.",
    "Closed. No hard feelings. Several soft ones.",
  ]),
  ...benchLibrary,
  ...authLibrary,
} as const;

/** Per-game speech. Every game has its own invite, start, win, lose and exit lines. */

export const gameLibrary = {
  forge: {
    name: "Forge the Pixels",
    invite: lines("game.forge.invite", ["Some pixels have wandered off the mark. Bring them home?", "The monogram's missing a few squares. I'm not fast. You look fast."]),
    start: lines("game.forge.start", ["Guide them onto the mark. They're attracted to you, oddly.", "Slow movements. The pixels are nervous today."]),
    win: lines("game.forge.win", ["Forged. That was quicker than me, and I do this for a living.", "Every pixel home. You're hired. Not really. But you'd do well here.", "Mark rebuilt. I'm putting that on the wall."]),
    lose: lines("game.forge.lose", ["Time's up, but the mark is mostly there. Mostly counts.", "Not quite. The pixels are stubborn today."]),
    exit: lines("game.forge.exit", ["The pixels will drift back on their own. Eventually.", "Left early. The mark understands."]),
  },
  glitch: {
    name: "Catch the Glitch",
    invite: lines("game.glitch.invite", ["One pixel in this grid is misbehaving. Can you spot it before I lose my patience?", "There's a glitch loose. It looks like the others, until it doesn't."]),
    start: lines("game.glitch.start", ["Watch the grid. One square is lying to you.", "It flickers when it thinks nobody's looking."]),
    win: lines("game.glitch.win", ["Caught it. That one was doing my job wrong on purpose.", "Glitch contained. QA would be proud. I am QA.", "Spotted every one. Your eyes are better than my sensors."]),
    lose: lines("game.glitch.lose", ["It got away. Glitches do that. Rematch?", "Too slow. It's fine; it'll be back in the next build."]),
    exit: lines("game.glitch.exit", ["Leaving the glitch out there? Brave.", "I'll keep an eye on it. I have two."]),
  },
  spark: {
    name: "Route the Spark",
    invite: lines("game.spark.invite", ["The forge needs power and the wiring is a mess. Route a spark for me?", "Connect the spark to the anvil. The tiles rotate. I didn't design them."]),
    start: lines("game.spark.start", ["Tap a tile to turn it. The spark needs an unbroken path.", "Left to right. No shortcuts; sparks don't jump."]),
    win: lines("game.spark.win", ["Connected. The forge hums again. That's your doing.", "Power restored. I'd say it was part of the plan, but you'd know I was lying.", "Route complete. Cleaner than the way I'd have done it."]),
    lose: lines("game.spark.lose", ["The spark fizzled. Wiring is hard. Try once more?", "Out of time. The forge will run on goodwill for now."]),
    exit: lines("game.spark.exit", ["Unrouted. The forge can wait. It's patient. I'm not.", "I'll route it myself later. Badly."]),
  },
  recall: {
    name: "Pixel Recall",
    invite: lines("game.recall.invite", ["I'll show you a pattern once. Just once. Then it's yours to remember.", "Short memory test. Purely for science. And bragging rights."]),
    start: lines("game.recall.start", ["Watch. Don't blink. Now you.", "Memorise the lit cells. I've already forgotten them."]),
    win: lines("game.recall.win", ["Perfect recall. You'd make a decent pixel.", "Pattern matched. I'm slightly jealous; I only remember grids.", "All rounds. That was the hard set, too. Mostly."]),
    lose: lines("game.recall.lose", ["Close. Memory is a muscle. Mine is a lookup table.", "Not that one. Happens to the best of us. And to me."]),
    exit: lines("game.recall.exit", ["Pattern forgotten. That's fine, I have it written down somewhere.", "Left mid-round. The pattern will haunt you gently."]),
  },
  hotforge: {
    name: "Hot Forge",
    invite: lines("game.hotforge.invite", ["The forge is running hot. Tap the pixels before they melt. I'm not allowed near it.", "Overheating cells. Cool them by tapping. Quickly. Calmly. Quickly."]),
    start: lines("game.hotforge.start", ["Tap the hottest ones first. They go white before they go.", "Steady hands. Heat spreads."]),
    win: lines("game.hotforge.win", ["Cooled. Every one. The forge owes you a favour.", "No losses. That's a first for this forge. I'm not counting my own attempts.", "Stabilised. You can hold your hand over it now. Please don't."]),
    lose: lines("game.hotforge.lose", ["Lost a few. They'll reform. The forge is forgiving; I'm not.", "Too hot. Happens. The trick is not to panic. I panic."]),
    exit: lines("game.hotforge.exit", ["Leaving it hot? Bold. I'll fan it with my arms.", "Fair. It'll cool on its own. Eventually. Probably."]),
  },
} as const;

export type GameId = keyof typeof gameLibrary;
export type GamePhase = "invite" | "start" | "win" | "lose" | "exit";
export const GAME_IDS = Object.keys(gameLibrary) as GameId[];

export type MessageKey = keyof typeof pipLibrary | `game.${GameId}.${GamePhase}`;

/** Resolves a category (plain or per-game) to its lines. */
export function linesFor(key: MessageKey): readonly PipLine[] {
  if (key.startsWith("game.")) {
    const [, game, phase] = key.split(".") as [string, GameId, GamePhase];
    return gameLibrary[game]?.[phase] ?? [];
  }
  return pipLibrary[key as keyof typeof pipLibrary] ?? [];
}

/** Total number of distinct lines, for reporting and tests. */
export function countLines(): number {
  let n = 0;
  for (const list of Object.values(pipLibrary)) n += list.length;
  for (const g of Object.values(gameLibrary)) for (const phase of ["invite", "start", "win", "lose", "exit"] as const) n += g[phase].length;
  return n;
}

/** Backwards-compatible view for the few callers that only need text. */
export const mascotMessages: Record<keyof typeof pipLibrary, readonly string[]> = Object.fromEntries(
  Object.entries(pipLibrary).map(([k, v]) => [k, v.map((l) => l.text)]),
) as unknown as Record<keyof typeof pipLibrary, readonly string[]>;
