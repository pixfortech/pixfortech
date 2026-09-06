"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "./Modal";
import { AppButton } from "@/components/app/primitives";

/** A button that opens a modal containing a form; the form receives onDone to close it. */
export function ModalButton({ label, title, children, variant = "primary", size = "md", wide }: { label: string; title: string; children: (onDone: () => void) => ReactNode; variant?: "primary" | "secondary" | "ghost"; size?: "sm" | "md"; wide?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <AppButton variant={variant} size={size} onClick={() => setOpen(true)}>{label}</AppButton>
      <Modal open={open} onClose={() => setOpen(false)} title={title} wide={wide}>{children(() => setOpen(false))}</Modal>
    </>
  );
}
