import type { Role } from "./types";

/**
 * Open roles. Publicly listed internships for Pixel Forge Technologies have
 * included a remote Shopify Developer (Frontend + Customisation) internship.
 * OWNER_VERIFY: confirm the role is still open, its compensation and the
 * application address before publication.
 */
export const roles: Role[] = [
  {
    slug: "shopify-developer-intern",
    title: "Shopify Developer Intern (Frontend + Customisation)",
    type: "Internship",
    location: "Remote",
    team: "Engineering",
    summary:
      "Work on real Shopify storefronts alongside the team: theme customisation, Liquid sections, storefront JavaScript and API-driven features.",
    responsibilities: [
      "Customise and optimise Shopify themes using Liquid, HTML, CSS and JavaScript",
      "Build and adjust theme sections and blocks so merchants can manage pages themselves",
      "Implement custom storefront features using Shopify APIs",
      "Improve responsiveness, accessibility and page speed on live stores",
      "Work with designers and senior developers through code review",
    ],
    requirements: [
      "Working knowledge of HTML, CSS and JavaScript",
      "Familiarity with Shopify themes and Liquid, or a strong willingness to learn quickly",
      "Attention to detail on responsive layouts",
      "Clear written communication for a remote team",
    ],
    niceToHave: ["Experience with Git", "Exposure to React, Node.js or PHP", "A personal project or store you can talk about"],
    compensation: "", // OWNER_VERIFY: publish stipend details here if desired
    published: true,
  },
];

export const careersIntro = {
  headline: "Learn the craft on real work.",
  body: [
    "Pixel Forge Technologies is a small, remote-first team. Everyone here builds real things for real clients from the first week, with senior review and a preference for doing fewer things properly.",
    "We are not hiring for every role at all times. If nothing below fits but you think you belong here, send an open application and tell us what you have built.",
  ],
  values: [
    { title: "Ship real work", body: "Interns and juniors work on client projects with review, not on throwaway exercises." },
    { title: "Remote, with structure", body: "Written briefs, clear priorities and regular reviews replace hallway conversations." },
    { title: "Craft over volume", body: "We would rather build one storefront properly than three badly." },
    { title: "Learn in public", body: "Code reviews are teaching sessions. Questions are expected." },
  ],
};
