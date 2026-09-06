/**
 * Site-wide metadata and contact details.
 * Edit this file to change global facts. Anything marked OWNER_VERIFY
 * must be confirmed by Pixel Forge Technologies before publication.
 */
export const site = {
  name: "Pixel Forge Technologies",
  shortName: "Pixel Forge",
  legalName: "Pixel Forge Technologies", // OWNER_VERIFY: registered legal entity name
  /** Canonical production origin. Override with NEXT_PUBLIC_SITE_URL. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://pixfortech.com", // OWNER_VERIFY: production domain
  tagline: "We forge digital experiences.",
  description:
    "Pixel Forge Technologies is a web engineering and digital product studio. Strategy, design and engineering for websites, Shopify commerce and web applications built to perform.",
  /** OWNER_VERIFY: replace with the monitored studio inbox. */
  email: "hello@pixfortech.com",
  /** Optional. Leave empty to hide. OWNER_VERIFY */
  phone: "",
  /** OWNER_VERIFY: city / country shown in the footer. Leave empty to hide. */
  location: "",
  /** IANA timezone used for the footer clock. OWNER_VERIFY */
  timezone: "Asia/Kolkata",
  /** OWNER_VERIFY: social profiles. Empty strings are hidden. */
  social: {
    linkedin: "",
    instagram: "",
    github: "",
    x: "",
  },
  foundingYear: "", // OWNER_VERIFY: leave empty to hide
} as const;

export type Site = typeof site;
