export type CalcInput =
  | { mode: "area"; area: string }
  | { mode: "wall"; length: string; height: string };
export type CalcField = "area" | "length" | "height";
export type CalcResult =
  | {
      ok: true;
      surfaceM2: number;
      extraM2: number;
      orderM2: number;
      unitCents: number;
      totalCents: number;
    }
  | { ok: false; field: CalcField; reason: "invalid" | "range" };

export const EXTRA_RATE = 0.1;
export const LIMITS = {
  area: [0.01, 10_000],
  length: [0.01, 100],
  height: [0.01, 100],
} as const;

const DECIMAL = /^\d+(?:[.,]\d+)?$/;

/** Parses "2.5" / "2,5" (outer whitespace trimmed). Anything else yields null. */
export function parseDecimal(input: string): number | null {
  const trimmed = input.trim();
  if (!DECIMAL.test(trimmed)) return null;
  const value = Number(trimmed.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

/** Half-up rounding to hundredths, returned as an integer count of hundredths. */
function toHundredths(x: number): number {
  // Shift the decimal point via exponent notation to avoid binary drift (1.005 * 100 = 100.49999...).
  return Math.round(Number(`${Number(x.toPrecision(12))}e2`));
}

function fromHundredths(h: number): number {
  return Number(`${h}e-2`);
}

function readField(
  field: CalcField,
  raw: string,
): { ok: true; value: number } | { ok: false; reason: "invalid" | "range" } {
  const value = parseDecimal(raw);
  if (value === null) return { ok: false, reason: "invalid" };
  const [min, max] = LIMITS[field];
  if (value < min || value > max) return { ok: false, reason: "range" };
  return { ok: true, value };
}

export function calculate(input: CalcInput, unitCents: number): CalcResult {
  if (!Number.isInteger(unitCents) || unitCents < 0) {
    throw new RangeError("unitCents must be a non-negative integer");
  }
  let surfaceH: number;
  if (input.mode === "area") {
    const area = readField("area", input.area);
    if (!area.ok) return { ok: false, field: "area", reason: area.reason };
    surfaceH = toHundredths(area.value);
  } else {
    const length = readField("length", input.length);
    if (!length.ok)
      return { ok: false, field: "length", reason: length.reason };
    const height = readField("height", input.height);
    if (!height.ok)
      return { ok: false, field: "height", reason: height.reason };
    surfaceH = toHundredths(length.value * height.value);
    if (surfaceH < 1) return { ok: false, field: "height", reason: "range" };
  }

  const extraH = toHundredths((surfaceH * EXTRA_RATE) / 100);
  const orderH = surfaceH + extraH;
  return {
    ok: true,
    surfaceM2: fromHundredths(surfaceH),
    extraM2: fromHundredths(extraH),
    orderM2: fromHundredths(orderH),
    unitCents,
    totalCents: Math.round((orderH * unitCents) / 100),
  };
}

export function formatArea(m2: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(m2);
}
