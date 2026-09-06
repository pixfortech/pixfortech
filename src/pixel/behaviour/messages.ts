/**
 * Mascot and interaction microcopy, centralised so tone stays consistent.
 * Transactional messages (form validation, errors) live with their components
 * and are never randomised.
 */
export const mascotMessages = {
  idle: [
    "Nothing to see here. Just me, holding pixels.",
    "I sort the loose pixels. Somebody has to.",
    "Every square on this page is mine. I count them at night.",
  ],
  greeting: [
    "Hello. I'm Pip. I keep the pixels in order around here.",
  ],
  dwell: [
    "Still here? I'm starting to think you like these pixels.",
    "You've been on this page long enough for me to forge a tiny distraction.",
    "Excellent. My plan to keep you here is working.",
    "Take your time. The pixels aren't going anywhere. Mostly.",
  ],
  scrollLoop: [
    "Up. Down. Up. Down. I'm getting pixel-sick.",
    "We've been past this bit before. The next pixels are getting jealous.",
    "There's more down there. I forged it myself.",
    "Excellent scrolling technique. Shall we try forward progress?",
  ],
  pageComplete: [
    "That's the lot. Every last pixel. Nicely forged.",
    "Bottom of the page. You've seen all of it. I'm oddly proud.",
    "All pixels forged. You may now feel accomplished.",
  ],
  projectComplete: [
    "End of the study. The next one is warmer, if you're curious.",
    "That's one whole project. I helped, in a supervisory capacity.",
  ],
  formSuccess: [
    "Sent. I personally escorted every character out of the building.",
    "Received. Somebody clever is already reading it.",
    "It's in. I'd celebrate, but I'm made of squares.",
  ],
  formFocus: [
    "I'll stay out of the way. Type freely.",
  ],
  gameInvite: [
    "Fancy a ten-second job? Some pixels have escaped and I'm not fast.",
    "I've lost a few pixels. Help me put them back and I'll stop staring.",
  ],
  gameWin: [
    "Forged. That was quicker than me, and I do this for a living.",
    "Every pixel home. You're hired. Not really. But you'd do well here.",
  ],
  gameExit: [
    "No problem. The pixels will find their own way back. Probably.",
  ],
  notFound: [
    "I looked everywhere. This page was never forged, or it's hiding brilliantly.",
    "I had the pixels for this page. Then I didn't. Long story.",
  ],
  dizzy: [
    "Okay. Okay. I need a moment. The room is doing a thing.",
  ],
  sleeping: [
    "zzz",
  ],
  wake: [
    "Oh. Hello again. I was resting my pixels.",
  ],
  themeShift: [
    "Ooh. New colours. I'll adjust.",
  ],
} as const;

export type MessageKey = keyof typeof mascotMessages;
