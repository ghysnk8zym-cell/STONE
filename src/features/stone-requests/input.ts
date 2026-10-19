import { z } from "zod";
import { hasHiddenCharacters } from "@/lib/plain-text";
import { MATERIALS } from "@/server/catalog/types";

export const PHOTO_MAX_BYTES = 512 * 1024;
export const PHOTO_MAX_SIDE = 512;
export const ORIGINAL_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const DEMO_TOTAL_REQUESTS = 50;
export const DEMO_USER_REQUESTS = 10;
const line = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((s) => !hasHiddenCharacters(s));
const dimension = z.number().int().min(1).max(10000);
export const requestInput = z
  .object({
    material: z.enum(MATERIALS),
    color: line(100),
    texture: line(100),
    lengthMm: dimension,
    widthMm: dimension,
    thicknessMm: dimension,
    quantity: z.number().int().min(1).max(10000),
    contactName: line(120),
    contactEmail: z
      .email()
      .max(254)
      .refine((s) => !hasHiddenCharacters(s)),
    contactPhone: z
      .string()
      .trim()
      .max(40)
      .regex(/^[0-9+() .-]*$/),
  })
  .strict();
export type RequestInput = z.infer<typeof requestInput>;
export type SubmitRequestResult =
  | { ok: true; id: string; number: string }
  | {
      ok: false;
      code:
        | "invalid"
        | "photo"
        | "rate-limit"
        | "quota"
        | "conflict"
        | "unavailable";
    };
