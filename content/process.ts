import type { ProcessStage } from "./types";

export const process: ProcessStage[] = [
  {
    index: "01",
    name: "Discover",
    verb: "Tell us what's broken.",
    summary:
      "Or what needs building. Rough notes are welcome. So are suspiciously long WhatsApp messages. We read your analytics, talk to the people who run the thing day to day, and write down what success looks like in plain terms.",
    activities: ["Stakeholder conversations", "Audit of the current site or store", "Audience and journey mapping", "Technical constraints and integrations", "Scope, budget and timeline agreement"],
    output: "A written brief we both sign off on.",
  },
  {
    index: "02",
    name: "Design",
    verb: "Give the idea some coordinates.",
    summary:
      "Structure, flows, hierarchy and visuals, before anybody gets emotionally attached to the wrong button. The visual layer is built on a token system so it survives contact with real content and future pages.",
    activities: ["Information architecture", "Wireframes and content hierarchy", "Design tokens and type system", "High-fidelity screens for key journeys", "Prototype of critical interactions"],
    output: "A design system and approved screens, not just pretty pictures.",
  },
  {
    index: "03",
    name: "Engineer",
    verb: "Make the pixels behave.",
    summary:
      "Responsive development and the less glamorous engineering that makes the glamorous part work: componentised frontends, accessible markup, a performance budget from day one, and code someone else could maintain.",
    activities: ["Component and section build", "CMS or storefront data modelling", "Integrations and APIs", "Accessibility and keyboard testing", "Performance profiling on real devices"],
    output: "A working product in a staging environment, reviewed together.",
  },
  {
    index: "04",
    name: "Refine",
    verb: "Poke everything.",
    summary:
      "Desktop. Mobile. Forms. Edge cases. Things users were definitely not expected to click three times. We test across the devices your audience really uses and fix what the numbers tell us to fix.",
    activities: ["Cross-device QA from 320px up", "Content and copy fit", "Analytics and event tracking", "Lighthouse and Core Web Vitals pass", "Launch checklist"],
    output: "A release candidate with a checklist, not a hope.",
  },
  {
    index: "05",
    name: "Launch",
    verb: "Release the pixels.",
    summary:
      "Then watch, learn and improve when the real world inevitably finds something creative to do with them. We handle deployment, redirects and monitoring, and stay on to iterate once real traffic arrives.",
    activities: ["Deployment and DNS", "Redirect and SEO continuity", "Monitoring and error tracking", "Handover documentation", "Optional ongoing iteration"],
    output: "A live product and a plan for what comes next.",
  },
];
