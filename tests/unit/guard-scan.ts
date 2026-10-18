import ts from "typescript";

/*
 * Static scan behind tests/unit/server-actions-guarded.test.ts. It reads a source file (TypeScript AST,
 * no execution) and reports every exported server action / route handler whose FIRST statement is not an
 * awaited call to `requireUser` / `requireRole`, or to a helper in the same file whose own first statement is
 * such a call (for example `currentUser()` in src/server/account/actions.ts).
 *
 * "First statement" is deliberate: a guard that runs after validation, a database read or a conditional
 * is not a boundary. Anything the scan cannot verify (a re-export, an export that is not a function) is
 * reported too, so it cannot slip through unseen.
 */

export type Finding = { id: string; problem: string };
export type ScanResult = { exports: string[]; findings: Finding[] };

const GUARDS = ["requireUser", "requireRole"];
const HTTP_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

type FunctionLike =
  ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression;

function parse(file: string, text: string): ts.SourceFile {
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
}

function hasExportModifier(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    !!ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  );
}

function hasDefaultModifier(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    !!ts
      .getModifiers(node)
      ?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
  );
}

function functionOf(expression: ts.Expression): FunctionLike | null {
  let current = expression;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  return ts.isArrowFunction(current) || ts.isFunctionExpression(current)
    ? current
    : null;
}

/** The call a statement is about, when its whole point is to await (or return) one call. */
function leadingCall(statement: ts.Statement): ts.CallExpression | null {
  let expression: ts.Expression | undefined;
  let awaitRequired = true;
  if (ts.isExpressionStatement(statement)) {
    expression = statement.expression;
  } else if (ts.isVariableStatement(statement)) {
    expression = statement.declarationList.declarations[0]?.initializer;
  } else if (ts.isReturnStatement(statement)) {
    expression = statement.expression;
    awaitRequired = false; // `return requireUser(...)` hands the promise to the caller
  }
  if (!expression) return null;
  let awaited = false;
  while (
    ts.isParenthesizedExpression(expression) ||
    ts.isAwaitExpression(expression)
  ) {
    if (ts.isAwaitExpression(expression)) awaited = true;
    expression = expression.expression;
  }
  if (!ts.isCallExpression(expression)) return null;
  if (awaitRequired && !awaited) return null;
  return expression;
}

function startsWithGuard(fn: FunctionLike, guards: Set<string>): boolean {
  const body = fn.body;
  if (!body || !ts.isBlock(body)) return false; // `() => expression`: no statement to guard
  const first = body.statements[0];
  if (!first) return false;
  const call = leadingCall(first);
  return (
    !!call &&
    ts.isIdentifier(call.expression) &&
    guards.has(call.expression.text)
  );
}

/** Top-level functions by name, from declarations and `const name = (async) () => ...`. */
function topLevelFunctions(source: ts.SourceFile): Map<string, FunctionLike> {
  const found = new Map<string, FunctionLike>();
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      found.set(statement.name.text, statement);
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const fn =
          declaration.initializer && functionOf(declaration.initializer);
        if (fn && ts.isIdentifier(declaration.name)) {
          found.set(declaration.name.text, fn);
        }
      }
    }
  }
  return found;
}

/** The guards plus every local helper that starts with one (resolved to a fixed point). */
function guardNames(functions: Map<string, FunctionLike>): Set<string> {
  const guards = new Set(GUARDS);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [name, fn] of functions) {
      if (!guards.has(name) && startsWithGuard(fn, guards)) {
        guards.add(name);
        grew = true;
      }
    }
  }
  return guards;
}

type Candidate = { name: string; fn: FunctionLike | null; why?: string };

function exportedCandidates(
  source: ts.SourceFile,
  functions: Map<string, FunctionLike>,
): Candidate[] {
  const candidates: Candidate[] = [];
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && hasExportModifier(statement)) {
      candidates.push({
        name: hasDefaultModifier(statement)
          ? "default"
          : (statement.name?.text ?? "default"),
        fn: statement,
      });
    } else if (
      ts.isVariableStatement(statement) &&
      hasExportModifier(statement)
    ) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue;
        const name = declaration.name.text;
        const initializer = declaration.initializer;
        const fn = initializer && functionOf(initializer);
        if (fn) {
          candidates.push({ name, fn });
        } else if (initializer && ts.isIdentifier(initializer)) {
          // `export const GET = handler;`
          const local = functions.get(initializer.text);
          candidates.push(
            local
              ? { name, fn: local }
              : {
                  name,
                  fn: null,
                  why: `re-exports ${initializer.text}, which the scan cannot see`,
                },
          );
        } else {
          candidates.push({
            name,
            fn: null,
            why: "is not a function the scan can check",
          });
        }
      }
    } else if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
      const clause = statement.exportClause;
      if (clause && ts.isNamedExports(clause)) {
        for (const element of clause.elements) {
          if (element.isTypeOnly) continue;
          const exported = element.name.text;
          const local = (element.propertyName ?? element.name).text;
          const fn = statement.moduleSpecifier ? null : functions.get(local);
          candidates.push(
            fn
              ? { name: exported, fn }
              : {
                  name: exported,
                  fn: null,
                  why: "is re-exported from elsewhere; guard it where it is defined",
                },
          );
        }
      } else {
        candidates.push({
          name: "*",
          fn: null,
          why: "export * hides which functions are exported",
        });
      }
    } else if (ts.isExportAssignment(statement)) {
      const expression = statement.expression;
      const fn =
        functionOf(expression) ??
        (ts.isIdentifier(expression) ? functions.get(expression.text) : null);
      candidates.push({
        name: "default",
        fn: fn ?? null,
        ...(fn ? {} : { why: "is not a function the scan can check" }),
      });
    }
  }
  return candidates;
}

function scan(
  file: string,
  text: string,
  include: (name: string) => boolean,
): ScanResult {
  const source = parse(file, text);
  const functions = topLevelFunctions(source);
  const guards = guardNames(functions);
  const result: ScanResult = { exports: [], findings: [] };
  for (const candidate of exportedCandidates(source, functions)) {
    if (!include(candidate.name)) continue;
    result.exports.push(candidate.name);
    const id = `${file}#${candidate.name}`;
    if (!candidate.fn) {
      result.findings.push({
        id,
        problem: `cannot be verified: it ${candidate.why}`,
      });
    } else if (!startsWithGuard(candidate.fn, guards)) {
      result.findings.push({
        id,
        problem:
          "does not start with an awaited requireUser / requireRole (or a helper that does); guard it first or allow-list it with a reason",
      });
    }
  }
  return result;
}

/** A `"use server"` module: every export is a callable POST endpoint. */
export function scanServerActionSource(file: string, text: string): ScanResult {
  return scan(file, text, () => true);
}

/** A `route.ts`: only the HTTP method exports are handlers (`dynamic`, `runtime` ... are config). */
export function scanRouteHandlerSource(file: string, text: string): ScanResult {
  return scan(file, text, (name) => HTTP_METHODS.has(name));
}
