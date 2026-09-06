import type { ProcessStage } from "./types";

export const process: ProcessStage[] = [
  {
    index: "01",
    name: "Discover",
    verb: "Understand the problem before proposing the product.",
    summary:
      "We start with what the business needs to happen, not with a feature list. That means reading your analytics, talking to the people who run the thing day to day, and writing down what success looks like in plain terms.",
    activities: ["Stakeholder conversations", "Audit of the current site or store", "Audience and journey mapping", "Technical constraints and integrations", "Scope, budget and timeline agreement"],
    output: "A written brief we both sign off on.",
  },
  {
    index: "02",
    name: "Design",
    verb: "Decide what the interface has to do, then make it look like it means it.",
    summary:
      "Structure first: content hierarchy, navigation, states and edge cases. Then the visual layer, built on a token system so it survives contact with real content and future pages.",
    activities: ["Information architecture", "Wireframes and content hierarchy", "Design tokens and type system", "High-fidelity screens for key journeys", "Prototype of critical interactions"],
    output: "A design system and approved screens, not just pretty pictures.",
  },
  {
    index: "03",
    name: "Engineer",
    verb: "Build it properly, in code someone else could maintain.",
    summary:
      "Componentised frontends, typed data, accessible markup and a performance budget from day one. For Shopify that means clean Liquid sections and metafields; for applications it means a backend your next developer will thank us for.",
    activities: ["Component and section build", "CMS or Shopify data modelling", "Integrations and APIs", "Accessibility and keyboard testing", "Performance profiling on real devices"],
    output: "A working product in a staging environment, reviewed together.",
  },
  {
    index: "04",
    name: "Refine",
    verb: "Test with the people who will actually use it.",
    summary:
      "We test across the devices your audience really uses, tune the details that only show up with real content, and fix what the numbers tell us to fix.",
    activities: ["Cross-device QA from 320px up", "Content and copy fit", "Analytics and event tracking", "Lighthouse and Core Web Vitals pass", "Launch checklist"],
    output: "A release candidate with a checklist, not a hope.",
  },
  {
    index: "05",
    name: "Launch",
    verb: "Ship, measure, and keep improving.",
    summary:
      "Launch is a Tuesday, not a ceremony. We handle DNS, redirects and monitoring, then stay on to iterate against what the data shows once real traffic arrives.",
    activities: ["Deployment and DNS", "Redirect and SEO continuity", "Monitoring and error tracking", "Handover documentation", "Optional ongoing iteration"],
    output: "A live product and a plan for what comes next.",
  },
];
