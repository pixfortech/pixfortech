/**
 * Brand microcopy registry.
 *
 * Reusable UI copy with a personality, grouped by context and addressed by
 * stable keys so components never carry ad-hoc strings. Functional labels
 * (field names, destructive confirmations, legal text, accessibility labels)
 * stay literal and live with their components; this file is for the voice.
 *
 * Rule of thumb: a clear action first, a quirky supporting line second.
 */
export const copy = {
  /** Public navigation and account entry points. */
  nav: {
    loginLabel: "Enter the Forge",
    /** Accessible names keep the visible words first (label-in-name), then the literal meaning. */
    loginAria: "Enter the Forge: sign in to Pixel Forge",
    loginHint: "Your projects are waiting behind this door.",
    loginMobile: "Enter the Forge",
    footerLogin: "Client portal",
    footerLoginHint: "Sign in to see your projects, requests and files.",
    accountLabel: "Your workshop",
    accountAria: "open your account menu",
    accountMenu: { dashboard: "Dashboard", projects: "Projects", notifications: "Notifications", profile: "Profile", settings: "Settings", signOut: "Sign out", signOutHint: "The pixels will keep your seat warm." },
    startProject: "Start a project",
  },

  /** Authentication screens. Field labels stay literal. */
  auth: {
    loginTitle: "Back to the Forge?",
    loginLead: "Your projects haven't wandered off. They're exactly where you left them.",
    loginFooter: "Locked out?",
    loginFooterLink: "Reset your password",
    loginVerified: "Email verified. You can sign in now.",
    loginWrong: "That email and password do not match.",
    loginUnverified: "Please verify your email first. We have sent you a new link.",
    magicSent: "Check your inbox. The sign-in link works once and expires in a few minutes.",
    magicSwitch: "Send me a sign-in link instead",
    passwordSwitch: "Use a password instead",
    forgotTitle: "Misplaced a password?",
    forgotLead: "It happens. Even pixels lose their coordinates. Tell us the email on the account and, if it exists, a reset link is on its way.",
    forgotSent: "If that address has an account, a reset link is on its way. It expires in an hour.",
    resetTitle: "Choose a new password",
    resetLead: "At least ten characters. A sentence you'll remember beats a word you'll forget.",
    resetInvalid: "This reset link is invalid or has expired. Request a new one from the sign-in page.",
    resetDone: "Password saved. Sign in and carry on forging.",
    verifyTitle: "Check your inbox",
    notClient: "Not a client yet? Start a project",
    signedOut: "Signed out. Come back whenever the forge calls.",
    showPassword: "Show password",
    hidePassword: "Hide password",
    stageAria: "PiP, the Pixel Forge mascot, keeping watch at the forge gate",
    stageCaption: "Forge gate",
    mustChangeTitle: "Change your temporary password",
    mustChangeBody: "This account was set up with a temporary password. Choose your own before you carry on; it takes ten seconds and nobody else knows the old one.",
  },

  /** Profile and account. */
  profile: {
    pageTitle: "Your forge identity",
    pageLead: "How you appear to the people you work with, and, if you choose, to the world.",
    identityTitle: "Identity",
    identityBody: "Name, title, timezone, a short bio and where else you live online.",
    usernameTitle: "Username",
    usernameBody: "A handle for mentions and search inside the Forge. Unique across everyone, in any case.",
    addressTitle: "Your corner of the Forge",
    addressBody: "A public page with your name, title, bio and picture. Off until you switch it on.",
    yourCorner: "Public address",
    publishHint: "When on, your page is public and listed in the sitemap. Off keeps it private and unindexed. Client accounts are always private.",
    savedTitle: "Profile saved",
    savedBody: "Every pixel in its place.",
    publishedTitle: "Profile published",
    publishedBody: "Your page is live and search engines are welcome.",
    unpublishedTitle: "Profile hidden",
    unpublishedBody: "Back to private. The address still resolves for you only.",
    passwordTitle: "Change the combination",
    passwordBody: "Changing your password signs out every other device.",
    passwordChanged: "Password changed. Other sessions were signed out.",
    passwordWrong: "The current password is wrong.",
    passwordShort: "The new password needs at least ten characters.",
    passwordMismatch: "The two new passwords do not match.",
    passwordSame: "That is the password you already have.",
  },

  /** Admin dashboard: quieter humour. Section names stay literal. */
  admin: {
    greeting: (name: string) => `Welcome back, ${name}.`,
    greetingLead: "The state of the forge right now.",
    attentionTitle: "Needs attention",
    attentionBody: "Prioritised. Overdue and blocked first, then anyone waiting on a reply.",
    attentionEmpty: "Nothing is on fire. Enjoy it; it never lasts.",
    pulseTitle: "Project pulse",
    pulseBody: "Progress, phase, health and the next thing due.",
    liveTitle: "Live activity",
    liveBody: "Events arrive here as they happen. No refresh required.",
    liveEmpty: "All quiet in the forge.",
    quickTitle: "Quick actions",
    workloadTitle: "Team workload",
    workloadBody: "Open tasks and requests per person. A signal, not a scoreboard.",
    myTasksEmpty: "Nothing assigned to you. Either you are very efficient or someone forgot.",
    inboxZero: "Inbox zero",
    inboxZeroBody: "No new requests. Enjoy it while it lasts.",
    calendarCalm: "Nothing due imminently",
    calendarCalmBody: "The calendar is calm.",
  },

  /** Client portal: reassuring. */
  portal: {
    greeting: (name: string) => `Welcome back, ${name}.`,
    decisionTitle: "Needs your decision",
    decisionBody: "The team is waiting on you for these.",
    decisionEmpty: "Nothing waiting on you. When the team needs a decision, it lands here.",
    requestsEmpty: "Nothing on the anvil yet",
    requestsEmptyBody: "When you need something changed, added or fixed, send a request and we will pick it up.",
    filesEmpty: "No files yet",
    filesEmptyBody: "Anything uploaded to this project will be listed here with who added it and when.",
  },

  /** Notifications: context first, personality second. */
  notifications: {
    bellEmpty: "All quiet in the forge.",
    markAll: "Mark all read",
    headline: { message: "New message", mention: "You were mentioned", request: "Request update", task: "Task update", approval: "Approval", milestone: "Milestone", file: "Fresh from the forge", project: "Project update", due: "Due soon", default: "Update" },
    reconnecting: "Reconnecting to live updates…",
    offline: "You're offline. The forge keeps working; we'll catch up when you're back.",
    reconnected: "Back online. Catching up on what you missed.",
  },

  /** Empty states across the product. */
  empty: {
    projects: { title: "No projects yet", body: "The first one usually starts with a conversation." },
    tasks: { title: "Nothing on the anvil", body: "Add a task and it will appear on the board." },
    messages: { title: "No messages yet", body: "Say hello. Someone on the team will reply here." },
    search: { title: "Nothing matched", body: "Try a project code, a task title or a person's name." },
    activity: { title: "No activity yet", body: "Once work starts, every change is logged here." },
    notifications: { title: "All quiet in the forge", body: "You are up to date." },
  },

  /** Games and mascot chrome. Speech lines live in the PiP library. */
  games: {
    notNow: "Not now",
    playLabel: "Play",
    close: "Close the game",
    escHint: "Escape closes at any time.",
  },

  /** Home page: PiP's bench beside the first section heading. */
  home: {
    benchEyebrow: "PiP's bench",
    benchLine: "Loose pixels enter at their own risk.",
    pixelsEyebrow: "Pixels at work",
    pixelsTitle: "Ideas come in messy. PiP sends them back aligned.",
    pixelsLead: "We take rough ideas, scattered requirements and “can-you-just-make-it-pop” moments, then turn them into precise digital experiences with a reason behind every decision.",
    benchCaption: "PiP gathers a few loose pixels, builds something small, checks it against the grid, corrects the one pixel that is out, and places the finished piece exactly where it belongs.",
    benchCaptionStatic: "PiP beside a finished pixel piece, placed exactly on its grid.",
    benchPoke: "PiP at the bench. Press for a reaction.",
  },

  /** Mascot chrome. */
  pip: {
    hide: "Hide PiP for this visit",
    show: "Missing PiP? Bring PiP back: show the PiP mascot",
    restoreLabel: "Missing PiP?",
    restoreHint: "Bring PiP back",
    poke: "PiP, the Pixel Forge mascot. Press for a reaction.",
    gate: "PiP at the forge gate. Press for a reaction.",
  },
} as const;

export type Copy = typeof copy;
