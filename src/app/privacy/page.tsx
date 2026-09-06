import { LegalPage } from "@/components/ui/LegalPage";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/content";

export const metadata = pageMetadata({ title: "Privacy policy", description: `How ${site.name} collects and uses personal information.`, path: "/privacy" });

// OWNER_VERIFY: have this policy reviewed for the jurisdictions you operate in.
const body = `This policy explains what personal information ${site.name} ("we", "us") collects through this website, why we collect it, and how you can control it.

## What we collect

- Enquiry details you submit through the contact form: your name, email address, company, phone number if provided, project description, budget and timeline, and any attachment you choose to include.
- Job application details you send to us by email.
- Technical information sent by your browser when you visit, such as IP address, browser type and pages viewed, held in standard server logs.

We do not use advertising trackers on this website.

## Why we collect it

- To respond to your enquiry and, if we work together, to deliver the project.
- To consider you for a role you have applied for.
- To keep the website secure and understand how it is used, in aggregate.

## Legal basis

We process enquiry and application data because it is necessary to take steps at your request before entering into a contract, and on the basis of our legitimate interest in running the studio. Where consent is required, we ask for it.

## How long we keep it

Enquiry records are kept for as long as needed to respond and, where a project follows, for the duration of the engagement and a reasonable period afterwards for accounting and legal purposes. Application data is deleted within twelve months unless you ask us to keep it. Server logs are rotated on a short cycle.

## Who we share it with

We use third-party providers to host this website and to deliver email. They process data on our behalf under contract. We do not sell personal information.

## Your rights

Depending on where you live, you may have the right to access, correct, delete or restrict the use of your personal information, to object to processing, and to data portability. To exercise any of these rights, email ${site.email}. You may also complain to your local data protection authority.

## Cookies

This website uses only strictly necessary cookies required for it to function. We do not set analytics or advertising cookies without asking first.

## Changes

We may update this policy from time to time. The date at the top shows the current version.

## Contact

Questions about this policy can be sent to ${site.email}.`;

export default function PrivacyPage() {
  return <LegalPage eyebrow="Legal" title="Privacy policy" updated="6 September 2026" source={body} />;
}
