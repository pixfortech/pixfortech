"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Arrow } from "@/components/ui/Button";
import { ATTACHMENT_MAX_BYTES, BUDGETS, PROJECT_TYPES, TIMELINES, enquirySchema, labelFor, type EnquiryErrors, type EnquiryInput } from "@/lib/enquiry-schema";
import { cn } from "@/lib/utils";
import { ChoiceGroup, Field, TextArea, TextInput } from "./fields";
import { behaviour } from "@/pixel/behaviour/store";

type Step = 0 | 1 | 2;
const STEPS = ["What", "Scope", "You"] as const;

const stepFields: Record<Step, (keyof EnquiryInput)[]> = {
  0: ["type"],
  1: ["summary", "budget", "timeline"],
  2: ["name", "company", "email", "phone"],
};

const empty: EnquiryInput = { type: "" as EnquiryInput["type"], summary: "", budget: "" as EnquiryInput["budget"], timeline: "" as EnquiryInput["timeline"], name: "", company: "", email: "", phone: "", website: "" };

export function EnquiryForm({ email }: { email: string }) {
  const initialType = useSearchParams().get("type") ?? "";
  const validInitial = PROJECT_TYPES.some((t) => t.value === initialType) ? (initialType as EnquiryInput["type"]) : ("" as EnquiryInput["type"]);
  const [data, setData] = useState<EnquiryInput>({ ...empty, type: validInitial });
  const [step, setStep] = useState<Step>(validInitial ? 1 : 0);
  const [errors, setErrors] = useState<EnquiryErrors & { attachment?: string }>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const reduce = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof EnquiryInput>(k: K, v: EnquiryInput[K]) => {
    setData((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    headingRef.current?.focus({ preventScroll: true });
  }, [step, status]);

  function validateStep(s: Step): boolean {
    const shape = enquirySchema.pick(Object.fromEntries(stepFields[s].map((k) => [k, true])) as Record<keyof EnquiryInput, true>);
    const res = shape.safeParse(data);
    if (res.success) return true;
    const next: EnquiryErrors = {};
    for (const issue of res.error.issues) {
      const key = issue.path[0] as keyof EnquiryInput;
      if (key && !next[key]) next[key] = issue.message;
    }
    setErrors((e) => ({ ...e, ...next }));
    return false;
  }

  function next() {
    if (!validateStep(step)) return;
    setStep((s) => (Math.min(2, s + 1) as Step));
  }
  function back() {
    setStep((s) => (Math.max(0, s - 1) as Step));
  }

  function onFile(f: File | null) {
    if (f && f.size > ATTACHMENT_MAX_BYTES) {
      setErrors((e) => ({ ...e, attachment: "Attachment must be under 10 MB." }));
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setErrors((e) => ({ ...e, attachment: undefined }));
    setFile(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep(2)) return;
    const full = enquirySchema.safeParse(data);
    if (!full.success) { setStep(0); return; }
    setStatus("submitting");
    setMessage("");
    const fd = new FormData();
    for (const [k, v] of Object.entries(full.data)) fd.set(k, v ?? "");
    if (file) fd.set("attachment", file);
    try {
      const res = await fetch("/api/enquiry", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; errors?: EnquiryErrors & { attachment?: string } };
      if (res.ok && json.ok) {
        setStatus("success");
        behaviour.setFormActive(false);
        behaviour.say("formSuccess", { state: "celebrating", stateMs: 4000, force: true });
      } else {
        setStatus("error");
        setMessage(json.message || "We could not send your enquiry. Please try again or email us directly.");
        if (json.errors) {
          setErrors(json.errors);
          const firstKey = Object.keys(json.errors)[0] as keyof EnquiryInput | "attachment" | undefined;
          if (firstKey) {
            const s = (Object.keys(stepFields) as unknown as Step[]).find((k) => stepFields[k].includes(firstKey as keyof EnquiryInput));
            setStep(s ?? 2);
          }
        }
      }
    } catch {
      setStatus("error");
      setMessage("Network problem. Please check your connection and try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-lg border border-line bg-ink-850/70 p-7 sm:p-10" role="status" aria-live="polite">
        <div className="flex items-center gap-3 text-forge-400">
          <span className="grid grid-cols-2 gap-0.5" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => <span key={i} className="h-2 w-2 bg-forge-500" />)}
          </span>
          <span className="eyebrow text-forge-400">Received</span>
        </div>
        <h2 ref={headingRef} tabIndex={-1} className="h2 mt-6 outline-none">Thanks, {data.name.split(" ")[0]}. We have it.</h2>
        <p className="lead mt-5 max-w-[34rem]">
          We will read it properly and reply to <span className="text-bone-50">{data.email}</span> within two working days, usually with a few questions before anything resembling a proposal.
        </p>
        <dl className="mt-8 grid gap-4 border-t border-line pt-6 text-small sm:grid-cols-3">
          <div><dt className="eyebrow mb-1">Building</dt><dd className="text-bone-50">{labelFor(PROJECT_TYPES, data.type)}</dd></div>
          <div><dt className="eyebrow mb-1">Budget</dt><dd className="text-bone-50">{labelFor(BUDGETS, data.budget)}</dd></div>
          <div><dt className="eyebrow mb-1">Timeline</dt><dd className="text-bone-50">{labelFor(TIMELINES, data.timeline)}</dd></div>
        </dl>
        <p className="mt-8 text-small text-bone-400">
          In the meantime, <Link href="/insights" className="link-line text-bone-50">read how we think</Link> or <Link href="/process" className="link-line text-bone-50">see how an engagement runs</Link>. Pip will keep an eye on the pixels.
        </p>
      </div>
    );
  }

  const panel = (key: string, node: React.ReactNode) => (
    <motion.div
      key={key}
      initial={reduce ? false : { opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduce ? undefined : { opacity: 0, x: -24 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {node}
    </motion.div>
  );

  return (
    <form onSubmit={submit} noValidate className="rounded-lg border border-line bg-ink-850/70 p-6 sm:p-10" aria-describedby="form-status">
      {/* Progress */}
      <ol className="mb-8 flex items-center gap-2" aria-label="Progress">
        {STEPS.map((label, i) => {
          const state = i < step ? "done" : i === step ? "current" : "todo";
          return (
            <li key={label} className="flex flex-1 items-center gap-2" aria-current={state === "current" ? "step" : undefined}>
              <span className={cn("h-1 flex-1 rounded-pill transition-colors duration-(--dur-base)", state === "todo" ? "bg-line-strong" : "bg-forge-500")} aria-hidden="true" />
              <span className={cn("num text-[0.6875rem] uppercase tracking-[0.12em]", state === "current" ? "text-bone-50" : "text-bone-600")}>
                <span className="sr-only">Step {i + 1} of {STEPS.length}: </span>{label}
              </span>
            </li>
          );
        })}
      </ol>

      <AnimatePresence mode="wait" initial={false}>
        {step === 0 && panel("s0", (
          <div>
            <h2 ref={headingRef} tabIndex={-1} className="h3 mb-6 outline-none">What are we forging?</h2>
            <ChoiceGroup legend="Project type" name="type" options={PROJECT_TYPES} value={data.type} onChange={(v) => set("type", v as EnquiryInput["type"])} error={errors.type} />
          </div>
        ))}
        {step === 1 && panel("s1", (
          <div className="flex flex-col gap-8">
            <h2 ref={headingRef} tabIndex={-1} className="h3 outline-none">Tell us about it.</h2>
            <Field label="Project summary" htmlFor="summary" error={errors.summary} hint="What it is, who it is for, and what is not working today. A few sentences is plenty. Typos welcome.">
              <TextArea id="summary" name="summary" value={data.summary} onChange={(e) => set("summary", e.target.value)} error={errors.summary} placeholder="We run a Shopify store selling ceramics. The theme fights us every time we…" aria-describedby="summary-hint" />
            </Field>
            <ChoiceGroup legend="Approximate budget" name="budget" options={BUDGETS} value={data.budget} onChange={(v) => set("budget", v as EnquiryInput["budget"])} error={errors.budget} columns={3} />
            <ChoiceGroup legend="Approximate timeline" name="timeline" options={TIMELINES} value={data.timeline} onChange={(v) => set("timeline", v as EnquiryInput["timeline"])} error={errors.timeline} />
          </div>
        ))}
        {step === 2 && panel("s2", (
          <div className="flex flex-col gap-6">
            <h2 ref={headingRef} tabIndex={-1} className="h3 outline-none">Where should we reply?</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Your name" htmlFor="name" error={errors.name}>
                <TextInput id="name" name="name" autoComplete="name" value={data.name} onChange={(e) => set("name", e.target.value)} error={errors.name} />
              </Field>
              <Field label="Company" htmlFor="company" error={errors.company} optional>
                <TextInput id="company" name="company" autoComplete="organization" value={data.company ?? ""} onChange={(e) => set("company", e.target.value)} error={errors.company} />
              </Field>
              <Field label="Email" htmlFor="email" error={errors.email}>
                <TextInput id="email" name="email" type="email" inputMode="email" autoComplete="email" value={data.email} onChange={(e) => set("email", e.target.value)} error={errors.email} />
              </Field>
              <Field label="Phone" htmlFor="phone" error={errors.phone} optional>
                <TextInput id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={data.phone ?? ""} onChange={(e) => set("phone", e.target.value)} error={errors.phone} />
              </Field>
            </div>
            <Field label="Attachment" htmlFor="attachment" error={errors.attachment} optional hint="Brief, wireframes or screenshots. PDF, images, ZIP or TXT up to 10 MB.">
              <div className="flex flex-wrap items-center gap-3">
                <input ref={fileRef} id="attachment" name="attachment" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.zip,.txt" onChange={(e) => onFile(e.target.files?.[0] ?? null)} className="sr-only" aria-describedby="attachment-hint" />
                <label htmlFor="attachment" className="inline-flex h-11 cursor-pointer items-center rounded-pill border border-line-strong px-5 text-small font-medium text-bone-50 transition-colors hover:border-bone-50 has-[:focus-visible]:outline-2">
                  Choose file
                </label>
                <span className="text-small text-bone-400">{file ? file.name : "No file chosen"}</span>
                {file && (
                  <button type="button" onClick={() => onFile(null)} className="text-small text-bone-400 underline underline-offset-4 hover:text-bone-50">Remove</button>
                )}
              </div>
            </Field>
            {/* Honeypot: hidden from people, tempting to bots */}
            <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" value={data.website ?? ""} onChange={(e) => set("website", e.target.value)} />
            </div>
          </div>
        ))}
      </AnimatePresence>

      <div id="form-status" aria-live="polite" className="min-h-6 mt-6">
        {status === "error" && message && (
          <p className="rounded-md border border-forge-500/40 bg-forge-500/10 px-4 py-3 text-small text-forge-300">
            {message} <a href={`mailto:${email}`} className="underline underline-offset-4">{email}</a>
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {step > 0 ? (
          <button type="button" onClick={back} className="inline-flex h-12 items-center justify-center rounded-pill px-5 text-small font-medium text-bone-200 hover:text-bone-50 transition-colors">
            Back
          </button>
        ) : <span />}
        {step < 2 ? (
          <button type="button" onClick={next} className="group inline-flex h-12 items-center justify-center gap-3 rounded-pill bg-bone-50 px-6 font-medium text-ink-950 transition-colors duration-(--dur-base) hover:bg-forge-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forge-400">
            Continue <Arrow />
          </button>
        ) : (
          <button type="submit" disabled={status === "submitting"} className="group inline-flex h-12 items-center justify-center gap-3 rounded-pill bg-bone-50 px-6 font-medium text-ink-950 transition-colors duration-(--dur-base) hover:bg-forge-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forge-400 disabled:opacity-60">
            {status === "submitting" ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-950/30 border-t-ink-950 motion-reduce:animate-none" aria-hidden="true" />
                Forging…
              </>
            ) : (
              <>Send it over <Arrow /></>
            )}
          </button>
        )}
      </div>
    </form>
  );
}
