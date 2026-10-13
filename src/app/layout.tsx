import "./globals.css";

// The real document (<html lang>) is rendered by app/[locale]/layout.tsx;
// app/not-found.tsx renders its own document for non-locale paths.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return children;
}
