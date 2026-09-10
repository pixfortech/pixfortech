/**
 * What PiP feels on the sign-in screens, as a pure reducer. Forms report
 * plain events (a field focused, a submission failed) and get back an
 * emotion, an optional line category, and whether the emotion should
 * settle back to the page's resting face after a while. Nothing here
 * depends on what is typed into the password field, only on whether it is
 * being typed at all.
 */
import type { MessageKey } from "../behaviour/messages";
import type { AuthEmotion } from "./emotions";

export type AuthPage = "login" | "signedout" | "verified" | "resetComplete" | "forgot" | "reset" | "resetInvalid" | "verify" | "verifyError";
export type AuthEvent =
  | { type: "load"; page: AuthPage }
  | { type: "emailFocus" } | { type: "emailBlur" } | { type: "emailTyping" }
  | { type: "passwordFocus" } | { type: "passwordBlur" } | { type: "passwordTyping" }
  | { type: "passwordShown" } | { type: "passwordHidden" }
  | { type: "magicMode" } | { type: "passwordMode" }
  | { type: "submit" } | { type: "failure" } | { type: "success" }
  | { type: "magicSent" } | { type: "forgotSent" } | { type: "resetDone" }
  | { type: "warn" }
  | { type: "idleTimeout" } | { type: "wake" } | { type: "poke" };

export type AuthPipState = {
  page: AuthPage;
  emotion: AuthEmotion;
  /** Emotion to settle into once `settleMs` elapses; null keeps the current one. */
  settleTo: AuthEmotion | null;
  settleMs: number;
  /** Line category to speak on this transition, if any. */
  say: MessageKey | null;
  /** True when the password field currently has focus: eyes stay covered whatever else happens. */
  secret: boolean;
  shown: boolean;
  /** Per-visit flags so the small talk happens once, not on every focus. */
  spoken: Partial<Record<string, true>>;
};

export const RESTING: Record<AuthPage, AuthEmotion> = {
  login: "idle", signedout: "goodbye", verified: "relieved", resetComplete: "relieved", forgot: "curious", reset: "attentive", resetInvalid: "worried", verify: "waiting", verifyError: "worried",
};
const LOAD_LINE: Record<AuthPage, MessageKey | null> = {
  login: "authIdle", signedout: "authLogout", verified: "authVerified", resetComplete: null, forgot: "authForgot", reset: "authReset", resetInvalid: "authForgot", verify: "authVerification", verifyError: "authVerification",
};

export const initialAuthState = (page: AuthPage = "login"): AuthPipState => ({ page, emotion: RESTING[page], settleTo: null, settleMs: 0, say: null, secret: false, shown: false, spoken: {} });

const once = (s: AuthPipState, key: string, say: MessageKey): Pick<AuthPipState, "say" | "spoken"> => (s.spoken[key] ? { say: null, spoken: s.spoken } : { say, spoken: { ...s.spoken, [key]: true } });
const hold = (emotion: AuthEmotion): Pick<AuthPipState, "emotion" | "settleTo" | "settleMs"> => ({ emotion, settleTo: null, settleMs: 0 });
const brief = (emotion: AuthEmotion, settleTo: AuthEmotion, settleMs: number): Pick<AuthPipState, "emotion" | "settleTo" | "settleMs"> => ({ emotion, settleTo, settleMs });

export function reduceAuth(s: AuthPipState, e: AuthEvent): AuthPipState {
  const rest = RESTING[s.page];
  switch (e.type) {
    case "load": {
      const page = e.page;
      return { ...initialAuthState(page), spoken: s.spoken, say: LOAD_LINE[page], ...(page === "signedout" ? brief("goodbye", "idle", 6000) : hold(RESTING[page])) };
    }
    case "emailFocus":
      if (s.secret) return s;
      return { ...s, ...hold("attentive"), ...once(s, "emailFocus", "authEmailFocus") };
    case "emailTyping":
      if (s.secret) return s;
      return { ...s, ...hold("reading"), ...once(s, "emailTyping", "authEmailTyping") };
    case "emailBlur":
      if (s.secret) return s;
      return { ...s, ...hold(rest), say: null };
    case "passwordFocus": {
      // A quick peek, then eyes covered for as long as the field has focus. Shown passwords skip the peek.
      const next = { ...s, secret: true, ...once(s, "passwordFocus", "authPasswordFocus") };
      return s.shown ? { ...next, ...hold("alarmed") } : { ...next, ...brief("peek", "privacy", 700) };
    }
    case "passwordTyping":
      // Same face whatever the length: the eyes are covered and stay covered.
      return { ...s, secret: true, ...hold(s.shown ? "alarmed" : "privacy"), ...once(s, "passwordTyping", "authPasswordTyping") };
    case "passwordBlur":
      // A password left visible on screen keeps him turned away until it is hidden again.
      return { ...s, secret: false, ...hold(s.shown ? "alarmed" : rest), say: null };
    case "passwordShown":
      return { ...s, shown: true, ...hold("alarmed"), ...once(s, "passwordShown", "authPasswordShown") };
    case "passwordHidden":
      return { ...s, shown: false, ...hold(s.secret ? "privacy" : rest), say: null };
    case "magicMode":
      return { ...s, secret: false, shown: false, ...brief("amused", rest, 3000), ...once(s, "magicMode", "authMagic") };
    case "passwordMode":
      return { ...s, ...hold(rest), say: null };
    case "submit":
      return { ...s, ...hold("thinking"), ...once(s, "submit", "authThinking") };
    case "failure":
      return { ...s, secret: false, ...brief("error", "attentive", 4500), say: "authFailure" };
    case "success":
      return { ...s, secret: false, shown: false, ...hold("success"), say: "authSuccess" };
    case "magicSent":
      return { ...s, secret: false, ...hold("waiting"), say: "authMagic" };
    case "forgotSent":
      return { ...s, ...hold("waiting"), say: "authResetSent" };
    case "resetDone":
      return { ...s, secret: false, shown: false, ...hold("relieved"), say: "authResetDone" };
    case "warn":
      // A validation slip (short or mismatched password): concern, no commentary, back to work shortly.
      return { ...s, ...brief("worried", s.secret ? "privacy" : rest, 2800), say: null };
    case "idleTimeout":
      if (s.secret || s.emotion === "success") return s;
      return { ...s, ...hold("sleepy"), ...once(s, "sleepy", "authSleepy") };
    case "wake":
      return s.emotion === "sleepy" ? { ...s, ...brief("curious", rest, 1500), say: null } : s;
    case "poke":
      if (s.secret) return { ...s, ...brief("peek", "privacy", 500), say: null };
      return { ...s, ...brief("amused", rest, 1800), say: null };
  }
}
