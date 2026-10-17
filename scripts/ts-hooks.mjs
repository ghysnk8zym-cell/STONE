// Side-effect module: lets Node's built-in type stripping load the app's TypeScript from a script.
//
// The app code is TypeScript with extensionless imports and `server-only` markers, which Node
// cannot load as is. The resolve hook below teaches it those two things, so scripts (the seed, the
// e2e server) run the same modules as the app without a compile step or a new dependency.
// Import this file first, then load app modules with dynamic `import()`.
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      // Marks a module as server-only for bundlers; there is nothing to enforce in a script.
      return { url: "data:text/javascript,", shortCircuit: true };
    }
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (!specifier.startsWith(".")) throw error;
      for (const candidate of [`${specifier}.ts`, `${specifier}/index.ts`]) {
        try {
          return nextResolve(candidate, context);
        } catch {
          // try the next candidate
        }
      }
      throw error;
    }
  },
});
