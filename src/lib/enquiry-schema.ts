import { z } from "zod";

export const PROJECT_TYPES = [
  { value: "website", label: "Website" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "web-app", label: "Web application" },
  { value: "ui-ux", label: "UI / UX" },
  { value: "improvement", label: "Improve existing product" },
  { value: "other", label: "Something else" },
] as const;

// OWNER_VERIFY: budget bands and currency. Adjust to match how the studio quotes.
export const BUDGETS = [
  { value: "under-2k", label: "Under $2k" },
  { value: "2k-5k", label: "$2k – $5k" },
  { value: "5k-15k", label: "$5k – $15k" },
  { value: "15k-plus", label: "$15k+" },
  { value: "unsure", label: "Not sure yet" },
] as const;

export const TIMELINES = [
  { value: "asap", label: "As soon as possible" },
  { value: "1-2-months", label: "1 – 2 months" },
  { value: "3-6-months", label: "3 – 6 months" },
  { value: "flexible", label: "Flexible" },
] as const;

const values = <T extends readonly { value: string }[]>(list: T) => list.map((i) => i.value) as [T[number]["value"], ...T[number]["value"][]];

export const enquirySchema = z.object({
  type: z.enum(values(PROJECT_TYPES), { message: "Choose what you are building." }),
  summary: z.string().trim().min(20, "Give us at least a couple of sentences.").max(4000, "Please keep this under 4000 characters."),
  budget: z.enum(values(BUDGETS), { message: "Pick an approximate budget." }),
  timeline: z.enum(values(TIMELINES), { message: "Pick an approximate timeline." }),
  name: z.string().trim().min(2, "Please enter your name.").max(120),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  email: z.email("Enter a valid email address."),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  /** Honeypot: should be empty. Checked after validation so bots get a normal-looking success. */
  website: z.string().max(500).optional(),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;
export type EnquiryErrors = Partial<Record<keyof EnquiryInput, string>>;

export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp", "application/zip", "text/plain"];

export function labelFor<T extends readonly { value: string; label: string }[]>(list: T, value: string): string {
  return list.find((i) => i.value === value)?.label ?? value;
}
