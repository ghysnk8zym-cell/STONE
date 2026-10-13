import { Inter, Lusitana, PT_Serif } from "next/font/google";

// Inter covers Latin and Cyrillic (body roles).
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

// Lusitana has a Latin subset only (ADR-003).
const lusitana = Lusitana({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-lusitana",
});

// Cyrillic fallback for the Lusitana roles. Only its Cyrillic @font-face is emitted, so
// Latin glyphs keep resolving in Lusitana through the `--font-display` stack order.
const ptSerif = PT_Serif({
  weight: ["400"],
  subsets: ["cyrillic"],
  variable: "--font-pt-serif",
});

/** Space-joined next/font variable classes; apply on <html> so --font-* resolve everywhere. */
export const fontVariables = [
  inter.variable,
  lusitana.variable,
  ptSerif.variable,
].join(" ");
