import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const spec = JSON.parse(
  readFileSync(resolve(root, "scripts/customer-export-spec.json"), "utf8"),
);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const git = (...args) =>
  execFileSync("git", ["-c", `safe.directory=${root}`, "-C", root, ...args], {
    maxBuffer: 120 * 1024 * 1024,
  });
const validationFiles = new Set([
  ".github/workflows/ci.yml",
  "scripts/export-customer.mjs",
  "scripts/customer-export-spec.json",
]);
function safePath(path) {
  if (
    typeof path !== "string" ||
    !path ||
    isAbsolute(path) ||
    path.includes("\\") ||
    path.split("/").some((part) => !part || part === "." || part === "..") ||
    /^(?:\.git\/|node_modules\/|\.data\/|\.next\/)/.test(path)
  )
    throw new Error("Unsafe export path");
  if (path.startsWith(".env") && !path.endsWith(".example"))
    throw new Error("Non-example environment file refused");
  return path;
}
const head = git("rev-parse", "HEAD").toString().trim();
const sourcePaths = git("ls-tree", "-r", "--name-only", "HEAD")
  .toString()
  .trim()
  .split("\n");
const expectedSource = new Map(
  spec.sourceFiles.map((file) => [safePath(file.path), file.sha256]),
);
if (expectedSource.size !== spec.sourceFiles.length)
  throw new Error("Duplicate source path");
for (const path of sourcePaths)
  if (!expectedSource.has(path) && !validationFiles.has(path))
    throw new Error(`Unregistered HEAD file: ${path}`);
for (const path of expectedSource.keys())
  if (!sourcePaths.includes(path))
    throw new Error(`Missing HEAD source: ${path}`);
const paths = [...expectedSource.keys()];
const batch = execFileSync(
  "git",
  ["-c", `safe.directory=${root}`, "-C", root, "cat-file", "--batch"],
  {
    input: paths.map((path) => `HEAD:${path}`).join("\n") + "\n",
    maxBuffer: 120 * 1024 * 1024,
  },
);
const source = new Map();
let offset = 0;
for (const path of paths) {
  const end = batch.indexOf(10, offset);
  const header = batch.subarray(offset, end).toString().split(" ");
  const length = Number(header[2]);
  if (end < 0 || header[1] !== "blob" || !Number.isSafeInteger(length))
    throw new Error(`Cannot read HEAD blob: ${path}`);
  const bytes = batch.subarray(end + 1, end + 1 + length);
  offset = end + 1 + length + 1;
  // Only the validation workflow may differ from the registered application snapshot.
  // Application, tests, dependencies, migrations and excluded internal files must match.
  if (!validationFiles.has(path) && digest(bytes) !== expectedSource.get(path))
    throw new Error(`HEAD changed without export spec update: ${path}`);
  source.set(path, bytes);
}
const overrides = new Map();
for (const item of spec.overrides) {
  const path = safePath(item.path);
  if (!item.reason || overrides.has(path) || !source.has(path))
    throw new Error("Invalid or unexplained override");
  overrides.set(path, Buffer.from(item.content, "utf8"));
}
const manifestBytes = Buffer.from(
  JSON.stringify(spec.customerManifest, null, 2),
);
if (digest(manifestBytes) !== spec.customerManifestSha256)
  throw new Error("Customer manifest digest mismatch");
const customer = new Map();
for (const file of spec.customerManifest.files) {
  const path = safePath(file.path);
  if (customer.has(path)) throw new Error("Duplicate customer path");
  const bytes = overrides.get(path) ?? source.get(path);
  if (!bytes || bytes.length !== file.bytes || digest(bytes) !== file.sha256)
    throw new Error(`Customer bytes do not match manifest: ${path}`);
  customer.set(path, bytes);
}
const excluded = new Set(spec.excluded.map(safePath));
for (const path of source.keys())
  if (customer.has(path) === excluded.has(path))
    throw new Error(`Source must be exported OR explicitly excluded: ${path}`);
for (const path of excluded)
  if (!source.has(path)) throw new Error("Unknown excluded path");
for (const path of spec.requiredNotices)
  if (!customer.get(path)?.equals(source.get(path)))
    throw new Error(`Required notice changed: ${path}`);
if (source.size !== 762 || customer.size !== 622 || excluded.size !== 140)
  throw new Error("Unexpected package counts");
const tempRoot = resolve(process.env.RUNNER_TEMP || tmpdir());
const output = resolve(process.argv[2] || resolve(tempRoot, "stone-customer"));
const within = relative(tempRoot, output);
if (
  !within ||
  within === ".." ||
  within.startsWith(`..${sep}`) ||
  isAbsolute(within) ||
  existsSync(output)
)
  throw new Error(
    "Export destination must be a NEW directory inside RUNNER_TEMP",
  );
mkdirSync(output, { recursive: true });
for (const [path, bytes] of customer) {
  const file = resolve(output, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, bytes, { flag: "wx" });
}
let checked = 0;
function verify(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Unexpected export symlink");
    if (entry.isDirectory()) verify(file);
    else {
      const path = relative(output, file).split(sep).join("/");
      if (
        !customer.has(path) ||
        digest(readFileSync(file)) !== digest(customer.get(path))
      )
        throw new Error("Written export mismatch");
      checked++;
    }
  }
}
verify(output);
if (checked !== customer.size) throw new Error("Written file count mismatch");
writeFileSync(`${output}.manifest.json`, manifestBytes, { flag: "wx" });
writeFileSync(
  `${output}.attestation.json`,
  JSON.stringify(
    {
      checkedSourceHead: head,
      applicationSourceCommit: spec.applicationSourceCommit,
      customerManifestSha256: digest(manifestBytes),
      customerManifestBytes: manifestBytes.length,
      exportedFiles: checked,
      excludedFiles: excluded.size,
      requiredNotices: spec.requiredNotices.map((path) => ({
        path,
        sha256: digest(customer.get(path)),
      })),
      verifiedBeforeDependencyInstallation: true,
    },
    null,
    2,
  ) + "\n",
  { flag: "wx" },
);
console.log(
  `Verified ${checked} exact customer files; manifest SHA-256 ${digest(manifestBytes)}`,
);
