"use client";

import { useState } from "react";

import { Button } from "@/components/buttons/Button";
import { MobileMenu } from "@/components/navigation/MobileMenu";

/**
 * Opens the real MobileMenu dialog at any viewport width (the header's own Menu button exists
 * below 1280 px only). The dialog is a full-screen, portalled, `inert`-ing modal, so it is shown
 * on demand instead of being framed statically. The label comes from the server section: the
 * `styleguide` messages are not sent to the browser (src/i18n/client-messages.ts).
 */
export function MobileMenuDemo({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="pill" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <MobileMenu open={open} onClose={() => setOpen(false)} current="cart" />
    </>
  );
}
