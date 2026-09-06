"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { behaviour } from "./store";
import { detectOscillation, shouldTriggerDwell, type ScrollSample } from "./heuristics";
import { scrollProgress } from "../counter";

/**
 * Feeds the behaviour store from real browsing signals. Owns no UI.
 * Everything here is throttled or event-driven; nothing runs per frame.
 */
export function BehaviourObserver() {
  const pathname = usePathname();
  const routeStart = useRef(0);
  const interacted = useRef(false);
  const samples = useRef<ScrollSample[]>([]);
  const lastInput = useRef(0);
  const reduced = useRef(false);
  const keyboardScroll = useRef(false);

  // Route changes
  useEffect(() => {
    routeStart.current = Date.now();
    interacted.current = false;
    samples.current = [];
    behaviour.setRoute(pathname);
    const max = scrollProgress(window.scrollY, window.innerHeight, document.documentElement.scrollHeight);
    behaviour.setMaxScroll(max);
    if (pathname !== "/404" && document.title.toLowerCase().includes("not found")) behaviour.setRoute("/404");
  }, [pathname]);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    lastInput.current = Date.now();

    const markInput = () => { lastInput.current = Date.now(); interacted.current = true; if (behaviour.get().mascot === "sleeping") { behaviour.setMascot("curious", 2500); behaviour.say("wake"); } };

    // Pointer look (throttled with rAF)
    let raf = 0; let px = 0, py = 0;
    const onMove = (e: PointerEvent) => {
      px = e.clientX; py = e.clientY; markInput();
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const ax = window.innerWidth - 56, ay = window.innerHeight - 56;
        const dx = px - ax, dy = py - ay;
        const d = Math.max(1, Math.hypot(dx, dy));
        const k = Math.min(1, 220 / d);
        behaviour.setLook((dx / d) * k, (dy / d) * k);
      });
    };
    const onKey = (e: KeyboardEvent) => {
      markInput();
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(e.key)) keyboardScroll.current = true;
    };
    const onTouch = () => markInput();

    // Scroll: samples for oscillation, max progress for the counter, completion
    let scrollRaf = 0;
    let settle = 0;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const onScroll = () => {
      markInput();
      if (coarse) {
        behaviour.setScrolling(true);
        clearTimeout(settle);
        settle = window.setTimeout(() => behaviour.setScrolling(false), 700);
      }
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        const now = Date.now();
        const y = window.scrollY;
        const arr = samples.current;
        arr.push({ t: now, y });
        while (arr.length && now - arr[0].t > 16000) arr.shift();
        const p = scrollProgress(y, window.innerHeight, document.documentElement.scrollHeight);
        const prevMax = behaviour.get().maxScroll;
        behaviour.setMaxScroll(p);
        if (p >= 0.985 && prevMax < 0.985) {
          const route = behaviour.get().route;
          if (route.startsWith("/work/")) behaviour.say("projectComplete", { state: "guiding", stateMs: 3500 });
          else if (!["/privacy", "/terms", "/contact"].includes(route)) behaviour.say("pageComplete", { state: "celebrating", stateMs: 3000 });
        }
        // Oscillation: not while using keyboard navigation or reduced motion
        if (!reduced.current && !keyboardScroll.current && detectOscillation(arr, window.innerHeight, now)) {
          if (behaviour.say("scrollLoop", { state: "dizzy", stateMs: 4500 })) samples.current = [];
        }
        keyboardScroll.current = false;
      });
    };

    // Forms: quiet while typing
    const formSelector = "input, textarea, select, [contenteditable=true]";
    const onFocusIn = (e: FocusEvent) => { const t = e.target as HTMLElement | null; if (t?.matches(formSelector) && t.getAttribute("type") !== "radio") behaviour.setFormActive(true); };
    const onFocusOut = (e: FocusEvent) => { const t = e.target as HTMLElement | null; if (t?.matches(formSelector)) setTimeout(() => { const a = document.activeElement as HTMLElement | null; if (!a?.matches(formSelector)) behaviour.setFormActive(false); }, 50); };

    // Dwell, boredom and sleep on a slow tick
    const tick = window.setInterval(() => {
      const now = Date.now();
      const st = behaviour.get();
      const idleMs = now - lastInput.current;
      if (document.hidden) return;
      if (idleMs > 90_000 && st.mascot !== "sleeping" && !st.gameOpen) { behaviour.setMascot("sleeping"); return; }
      if (st.mascot === "sleeping") return;
      const msOnRoute = now - routeStart.current;
      if (shouldTriggerDwell({ msOnRoute, interacted: interacted.current, formActive: st.formActive, dialogOpen: st.gameOpen || st.menuOpen, shownRecently: behaviour.count("dwell") >= 1 && msOnRoute < 150_000 })) {
        const invite = behaviour.count("gameInvite") === 0 && !reduced.current;
        if (invite) behaviour.say("gameInvite", { state: "bored", stateMs: 6000, action: { label: "Help Pip", kind: "game" }, durationMs: 14000 });
        else behaviour.say("dwell", { state: "bored", stateMs: 5000 });
        routeStart.current = now; // don't re-fire until another full dwell period
      } else if (idleMs > 25_000 && idleMs < 27_000 && st.mascot === "idle") {
        behaviour.setMascot("bored", 6000);
      }
    }, 2000);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      clearInterval(tick);
      clearTimeout(settle);
      if (raf) cancelAnimationFrame(raf);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  return null;
}
