import { describe, expect, it } from "vitest";
import { AUTH_EMOTIONS, authCells, showsEyes } from "../auth/emotions";
import { initialAuthState, reduceAuth, RESTING, type AuthEvent, type AuthPipState } from "../auth/logic";
import { linesFor, pipLibrary } from "../behaviour/messages";

const run = (events: AuthEvent[], start: AuthPipState = initialAuthState("login")) => events.reduce((s, e) => reduceAuth(s, e), start);

describe("gatekeeper faces", () => {
  it("every emotion is a distinct face and the privacy faces show no eye", () => {
    const seen = new Map<string, string>();
    for (const e of AUTH_EMOTIONS) {
      const cells = authCells(e);
      expect(cells.length).toBeGreaterThan(40);
      const key = cells.map((c) => `${c.x},${c.y},${c.k}`).sort().join("|");
      expect(seen.has(key), `${e} duplicates ${seen.get(key)}`).toBe(false);
      seen.set(key, e);
      for (const c of cells) { expect(c.x).toBeGreaterThanOrEqual(0); expect(c.x).toBeLessThan(12); expect(c.y).toBeGreaterThanOrEqual(0); expect(c.y).toBeLessThan(12); }
    }
    expect(showsEyes(authCells("privacy"))).toBe(false);
    expect(authCells("privacy").filter((c) => c.k === "hand").length).toBeGreaterThanOrEqual(8);
    const peek = authCells("peek");
    expect(peek.filter((c) => c.k === "pupil")).toHaveLength(1);
    expect(showsEyes(authCells("idle"))).toBe(true);
    expect(authCells("goodbye", [0.5, 0.5], 0)).not.toEqual(authCells("goodbye", [0.5, 0.5], 1));
  });
});

describe("gatekeeper logic", () => {
  it("greets on load and rests in the page's face", () => {
    const s = run([{ type: "load", page: "login" }]);
    expect(s.emotion).toBe("idle"); expect(s.say).toBe("authIdle");
    const v = run([{ type: "load", page: "verify" }]);
    expect(v.emotion).toBe("waiting"); expect(v.say).toBe("authVerification");
    const out = run([{ type: "load", page: "signedout" }]);
    expect(out.emotion).toBe("goodbye"); expect(out.say).toBe("authLogout"); expect(out.settleTo).toBe("idle");
  });
  it("notices the email field and reads along, speaking about each only once", () => {
    let s = run([{ type: "load", page: "login" }, { type: "emailFocus" }]);
    expect(s.emotion).toBe("attentive"); expect(s.say).toBe("authEmailFocus");
    s = run([{ type: "emailTyping" }], s);
    expect(s.emotion).toBe("reading"); expect(s.say).toBe("authEmailTyping");
    s = run([{ type: "emailBlur" }, { type: "emailFocus" }], s);
    expect(s.emotion).toBe("attentive"); expect(s.say).toBeNull();
  });
  it("covers its eyes for the password and keeps them covered whatever is typed", () => {
    let s = run([{ type: "load", page: "login" }, { type: "passwordFocus" }]);
    expect(s.emotion).toBe("peek"); expect(s.settleTo).toBe("privacy"); expect(s.secret).toBe(true); expect(s.say).toBe("authPasswordFocus");
    const faces = new Set<string>();
    for (let i = 0; i < 40; i++) { s = reduceAuth(s, { type: "passwordTyping" }); faces.add(s.emotion); }
    expect([...faces]).toEqual(["privacy"]);
    expect(showsEyes(authCells(s.emotion))).toBe(false);
    // Nothing else may uncover them while the field has focus.
    expect(run([{ type: "emailFocus" }], s).emotion).toBe("privacy");
    expect(run([{ type: "poke" }], s).settleTo).toBe("privacy");
    expect(run([{ type: "idleTimeout" }], s).emotion).toBe("privacy");
    s = reduceAuth(s, { type: "passwordBlur" });
    expect(s.secret).toBe(false); expect(s.emotion).toBe(RESTING.login);
  });
  it("turns further away when the password is shown, and never comments on the value", () => {
    let s = run([{ type: "load", page: "login" }, { type: "passwordFocus" }, { type: "passwordShown" }]);
    expect(s.emotion).toBe("alarmed"); expect(s.say).toBe("authPasswordShown");
    s = reduceAuth(s, { type: "passwordTyping" });
    expect(s.emotion).toBe("alarmed");
    // Leaving the field while the password is still visible keeps him turned away; hiding it releases him.
    s = reduceAuth(s, { type: "passwordBlur" });
    expect(s.emotion).toBe("alarmed"); expect(s.secret).toBe(false);
    s = reduceAuth(s, { type: "passwordHidden" });
    expect(s.emotion).toBe(RESTING.login);
    s = reduceAuth(s, { type: "passwordFocus" });
    s = reduceAuth(s, { type: "passwordShown" });
    s = reduceAuth(s, { type: "passwordHidden" });
    expect(s.emotion).toBe("privacy");
    const state = JSON.stringify(s);
    expect(state).not.toMatch(/length|value|chars/);
  });
  it("takes a failed attempt with concern and settles back to attentive; a success opens the gate", () => {
    const failed = run([{ type: "load", page: "login" }, { type: "passwordFocus" }, { type: "submit" }, { type: "failure" }]);
    expect(failed.emotion).toBe("error"); expect(failed.say).toBe("authFailure"); expect(failed.settleTo).toBe("attentive"); expect(failed.secret).toBe(false);
    const ok = run([{ type: "load", page: "login" }, { type: "submit" }, { type: "success" }]);
    expect(ok.emotion).toBe("success"); expect(ok.say).toBe("authSuccess"); expect(ok.settleTo).toBeNull();
    expect(reduceAuth(ok, { type: "idleTimeout" }).emotion).toBe("success");
  });
  it("handles the reset and magic flows with their own faces", () => {
    expect(run([{ type: "load", page: "forgot" }, { type: "submit" }, { type: "forgotSent" }])).toMatchObject({ emotion: "waiting", say: "authResetSent" });
    expect(run([{ type: "load", page: "reset" }, { type: "warn" }])).toMatchObject({ emotion: "worried", say: null, settleTo: "attentive" });
    expect(run([{ type: "load", page: "reset" }, { type: "resetDone" }])).toMatchObject({ emotion: "relieved", say: "authResetDone" });
    expect(run([{ type: "load", page: "login" }, { type: "magicMode" }])).toMatchObject({ emotion: "amused", say: "authMagic" });
    expect(run([{ type: "load", page: "login" }, { type: "magicMode" }, { type: "submit" }, { type: "magicSent" }])).toMatchObject({ emotion: "waiting" });
    expect(run([{ type: "load", page: "resetComplete" }])).toMatchObject({ emotion: "relieved", say: null });
  });
  it("dozes after a long quiet spell and wakes on activity", () => {
    const s = run([{ type: "load", page: "login" }, { type: "idleTimeout" }]);
    expect(s.emotion).toBe("sleepy"); expect(s.say).toBe("authSleepy");
    expect(reduceAuth(s, { type: "wake" })).toMatchObject({ emotion: "curious", settleTo: "idle" });
  });
});

describe("gatekeeper lines", () => {
  it("has a small, original category for every auth moment", () => {
    const keys = ["authIdle", "authEmailFocus", "authEmailTyping", "authPasswordFocus", "authPasswordTyping", "authPasswordShown", "authThinking", "authFailure", "authSuccess", "authLogout", "authForgot", "authResetSent", "authReset", "authResetDone", "authVerification", "authVerified", "authMagic", "authSleepy"] as const;
    const all = new Set<string>();
    for (const k of keys) {
      const lines = linesFor(k);
      expect(lines.length, k).toBeGreaterThanOrEqual(3);
      for (const l of lines) { expect(l.text.length).toBeLessThanOrEqual(110); expect(all.has(l.text)).toBe(false); all.add(l.text); expect(l.id.startsWith(`${k}.`)).toBe(true); }
    }
    expect(Object.keys(pipLibrary).length).toBeGreaterThanOrEqual(55);
    // No mockery in the failure lines.
    for (const l of linesFor("authFailure")) expect(l.text).not.toMatch(/stupid|idiot|wrong again|fail/i);
  });
});
