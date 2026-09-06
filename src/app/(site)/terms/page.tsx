import { LegalPage } from "@/components/ui/LegalPage";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/content";

export const metadata = pageMetadata({ title: "Terms of use", description: `Terms governing use of the ${site.name} website.`, path: "/terms" });

// OWNER_VERIFY: have these terms reviewed by a legal adviser before publication.
const body = `These terms govern your use of this website, operated by ${site.name}. By using the website you agree to them. They do not govern any project engagement, which is covered by a separate written agreement.

## Use of the website

You may browse the website and use the contact form to make a genuine enquiry. You must not use the website in any way that is unlawful, that interferes with its operation, or that attempts to gain unauthorised access to any system.

## Content

All content on this website, including text, design, code, graphics and the Pixel Forge name and mark, belongs to ${site.name} or its licensors. You may not copy, reproduce or reuse it without written permission, other than for personal, non-commercial viewing.

Sample case-study layouts are labelled as such and do not describe real client engagements.

## Enquiries

Submitting an enquiry does not create a contract. Any proposal we send is subject to a written agreement. We aim to respond to enquiries within two working days but do not guarantee a response time.

## Accuracy

We take care to keep the website accurate, but it is provided as general information without warranties of any kind. Services, technologies and roles described may change without notice.

## Liability

To the fullest extent permitted by law, ${site.name} is not liable for any loss arising from your use of, or inability to use, this website. Nothing in these terms excludes liability that cannot be excluded by law.

## Links

The website may link to third-party sites. We are not responsible for their content or practices.

## Changes

We may update these terms at any time by publishing a new version here.

## Contact

Questions about these terms can be sent to ${site.email}.`;

export default function TermsPage() {
  return <LegalPage eyebrow="Legal" title="Terms of use" updated="6 September 2026" source={body} />;
}
