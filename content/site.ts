/**
 * Site-wide facts and contact details, as confirmed by the owner.
 * Edit this file to change global facts. Anything still marked
 * OWNER_VERIFY has not been confirmed for publication.
 */
export const site = {
  name: "Pixel Forge Technologies",
  shortName: "Pixel Forge",
  legalName: "Pixel Forge Technologies",
  /** Canonical production origin. Override with NEXT_PUBLIC_SITE_URL. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://pixfortech.com",
  tagline: "Forging websites. Supervising pixels. Occasionally arguing with margins.",
  description:
    "Pixel Forge Technologies is a web design and development studio in Kolkata, India. Websites, e-commerce and digital experiences built with intent, engineered with precision, and polished until every pixel knows where it belongs.",
  /** One line for the bottom of the footer. */
  footerLine: "Built with unreasonable attention to small squares.",
  email: "pixfortech@gmail.com",
  /** Optional. Leave empty to hide. */
  phone: "",
  location: "Kolkata, India",
  /** IANA timezone used for the footer clock. */
  timezone: "Asia/Kolkata",
  founder: { name: "Aman Rahul Chaurasia", role: "Founder & CEO" },
  /** Social profiles. Empty strings are hidden. */
  social: {
    linkedin: "https://linkedin.com/pixel-forge-technologies",
    instagram: "https://instagram.com/pixfortechofficial",
    github: "",
    x: "",
  },
  foundingYear: "", // OWNER_VERIFY: leave empty to hide
} as const;

export type Site = typeof site;
