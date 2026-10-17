// Stand-in for the Node-only database drivers (pg, PGlite) in the Cloudflare Worker build,
// where next.config.ts aliases them to this file so their code (and PGlite's ~20 MB of
// WebAssembly) never ships. Importing it fails loudly instead of at the first query.
throw new Error(
  "This database driver is not available on Cloudflare Workers: set DATABASE_URL to a Neon (postgres://…neon.tech) URL",
);

export {};
