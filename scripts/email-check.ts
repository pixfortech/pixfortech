/**
 * Email delivery check for operators.
 *
 *   npm run email:check -- --to=<address>              send a probe through Resend and wait for its delivery event
 *   npm run email:check -- --status=<resend-id>        report the delivery event for a message already sent
 *   npm run email:check -- --verify=<address> --app=<origin>
 *                                                      ask the deployed app to resend its verification email
 *
 * Needs RESEND_API_KEY (and EMAIL_FROM) in the environment for the first two
 * modes. Prints Resend's own error text on refusal; never prints the key.
 */
import { existsSync } from "node:fs";
import { getStatus, requestVerificationEmail, sendProbe, waitForDelivery } from "./lib/resend";

if (existsSync(".env.local") && !process.env.RESEND_API_KEY) process.loadEnvFile(".env.local");

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const to = arg("to"), status = arg("status"), verify = arg("verify");
const app = arg("app") ?? process.env.NEXT_PUBLIC_APP_URL;

function explain(name: string, message: string): string {
  const m = message.toLowerCase();
  if (m.includes("own email address") || m.includes("testing emails")) return "Cause: the sender is Resend's sandbox address, which only delivers to the Resend account owner's own inbox. Either verify a sending domain in Resend and set EMAIL_FROM to it, or send to the account owner's address.";
  if (m.includes("domain is not verified") || m.includes("not verified")) return "Cause: EMAIL_FROM uses a domain that Resend has not verified yet. Complete the domain's DNS records in Resend or use a verified sender.";
  if (name.toLowerCase().includes("validation") || m.includes("api key")) return "Cause: the API key was rejected. Check RESEND_API_KEY in the deployment's environment.";
  return "";
}

async function main() {
  if (status) {
    const s = await getStatus(status);
    if (!s.ok) { console.error(`Resend could not find ${status}: ${s.status} ${s.message}`); process.exitCode = 1; }
    else console.log(`id=${s.id}\nlast event: ${s.lastEvent}\nto: ${s.to.join(", ")}\nfrom: ${s.from}\nsubject: ${s.subject}\ncreated: ${s.createdAt}`);
  } else if (to) {
    const sent = await sendProbe({ to });
    if (!sent.ok) {
      console.error(`Resend refused the probe to ${to}: ${sent.status} ${sent.name}: ${sent.message}`);
      const why = explain(sent.name, sent.message);
      if (why) console.error(why);
      process.exitCode = 1;
    } else {
      console.log(`Resend accepted the probe: id=${sent.id}. Waiting for a delivery event…`);
      const s = await waitForDelivery(sent.id);
      if (!s.ok) { console.error(`Status lookup failed: ${s.status} ${s.message}`); process.exitCode = 1; }
      else {
        console.log(`last event: ${s.lastEvent} (to ${s.to.join(", ")} from ${s.from})`);
        if (s.lastEvent !== "delivered") { console.error(s.lastEvent === "sent" ? "Resend handed the message to the recipient's server but has not confirmed delivery yet; check again with --status." : `Delivery did not succeed (${s.lastEvent}).`); process.exitCode = s.lastEvent === "sent" ? 0 : 1; }
      }
    }
  } else if (verify) {
    if (!app) throw new Error("--app=<origin> (or NEXT_PUBLIC_APP_URL) is required to request a verification email.");
    const r = await requestVerificationEmail(app, verify);
    console.log(`${app}/api/auth/send-verification-email answered ${r.status}: ${r.body}`);
    console.log("That endpoint answers 200 for unknown or already verified addresses too. Confirm the send in the application's server log (`[email] resend accepted id=…`) and then run `npm run email:check -- --status=<id>`.");
    if (r.status >= 400) process.exitCode = 1;
  } else {
    console.log("Usage: --to=<address> | --status=<resend-id> | --verify=<address> --app=<origin>");
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
