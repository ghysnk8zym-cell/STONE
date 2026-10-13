import Link from "next/link";

import messages from "../../messages/en.json";

// Rendered for paths outside /ru and /en, where no locale layout exists.
export default function RootNotFound() {
  return (
    <html lang="en">
      <body>
        <main>
          <h1>{messages.notFound.title}</h1>
          <Link href="/">{messages.notFound.back}</Link>
        </main>
      </body>
    </html>
  );
}
