import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import { pathToFileURL } from "node:url";

function within(root, file) {
  const name = relative(root, file);
  return (
    name !== ".." &&
    !name.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) &&
    !isAbsolute(name)
  );
}

function linksIn(root) {
  const links = [];
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const file = join(dir, name);
      const stat = lstatSync(file);
      if (stat.isSymbolicLink()) links.push(file);
      else if (stat.isDirectory()) walk(file);
    }
  }
  walk(root);
  return links;
}

/** Next on Windows copies pnpm's absolute junctions. Repoint generated links to traced copies. */
export function normalizeStandaloneLinks(root, buildRoot) {
  const output = resolve(root);
  const links = linksIn(output).map((file) => {
    const oldTarget = resolve(dirname(file), readlinkSync(file));
    const target = within(output, oldTarget)
      ? oldTarget
      : within(join(buildRoot, "node_modules"), oldTarget)
        ? join(output, relative(buildRoot, oldTarget))
        : null;
    if (!target || !existsSync(target)) {
      throw new Error(
        "Standalone link has no traced internal target; artifact is not portable.",
      );
    }
    return { file, target };
  });
  for (const { file, target } of links) {
    // Only links in this generated output, never their source or target contents.
    unlinkSync(file);
    symlinkSync(
      process.platform === "win32" ? target : relative(dirname(file), target),
      file,
      process.platform === "win32" ? "junction" : "dir",
    );
  }
  assertInternalLinks(output);
  return links.length;
}

export function assertInternalLinks(root) {
  const output = resolve(root);
  for (const file of linksIn(output)) {
    const target = resolve(dirname(file), readlinkSync(file));
    if (
      !within(output, target) ||
      !existsSync(target) ||
      !within(realpathSync(output), realpathSync(file))
    ) {
      throw new Error(
        "Runtime contains an external or missing dependency link.",
      );
    }
  }
}

/** Copy without overwriting, then rebase Windows junctions into the new runtime. */
export function copyNodeRuntime(source, destination) {
  const from = resolve(source);
  const to = resolve(destination);
  assertInternalLinks(from);
  // Resolve an existing ancestor before creating anything: an alias to `from`
  // must not let a supposedly separate destination recurse into its own source.
  let ancestor = to;
  const suffix = [];
  while (!existsSync(ancestor)) {
    suffix.unshift(basename(ancestor));
    const parent = dirname(ancestor);
    if (parent === ancestor) {
      throw new Error("Runtime destination has no accessible filesystem root.");
    }
    ancestor = parent;
  }
  const physicalTarget = resolve(realpathSync(ancestor), ...suffix);
  if (
    within(from, to) ||
    within(realpathSync(from), physicalTarget) ||
    existsSync(to)
  ) {
    throw new Error(
      "Choose a new runtime directory outside the source artifact.",
    );
  }
  const links = [];
  function copy(dir, target) {
    mkdirSync(target, { recursive: true });
    for (const name of readdirSync(dir)) {
      const file = join(dir, name);
      const out = join(target, name);
      const stat = lstatSync(file);
      if (stat.isSymbolicLink()) {
        const resolved = resolve(dirname(file), readlinkSync(file));
        links.push({ out, target: join(to, relative(from, resolved)) });
      } else if (stat.isDirectory()) copy(file, out);
      else cpSync(file, out, { force: false, errorOnExist: true });
    }
  }
  copy(from, to);
  for (const link of links) {
    symlinkSync(
      process.platform === "win32"
        ? link.target
        : relative(dirname(link.out), link.target),
      link.out,
      process.platform === "win32" ? "junction" : "dir",
    );
  }
  assertInternalLinks(to);
  return { links: links.length };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    if (process.argv.length !== 4)
      throw new Error(
        "Usage: node copy-node-runtime.mjs <source-artifact> <new-runtime-directory>",
      );
    const result = copyNodeRuntime(process.argv[2], process.argv[3]);
    console.log(
      `Runtime copied; ${result.links} internal dependency links verified.`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
