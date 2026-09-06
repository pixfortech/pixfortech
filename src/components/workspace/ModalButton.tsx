"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Modal } from "./Modal";
import { AppButton } from "@/components/app/primitives";

const DoneContext = createContext<(() => void) | null>(null);

/** Forms rendered inside a ModalButton read the close handler from here when no onDone prop is given. */
export const useModalDone = () => useContext(DoneContext);

/** A button that opens a modal containing a form. Children are plain nodes so server components can use it. */
export function ModalButton({ label, title, children, variant = "primary", size = "md", wide }: { label: string; title: string; children: ReactNode; variant?: "primary" | "secondary" | "ghost"; size?: "sm" | "md"; wide?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <AppButton variant={variant} size={size} onClick={() => setOpen(true)}>{label}</AppButton>
      <Modal open={open} onClose={() => setOpen(false)} title={title} wide={wide}><DoneContext.Provider value={() => setOpen(false)}>{children}</DoneContext.Provider></Modal>
    </>
  );
}
