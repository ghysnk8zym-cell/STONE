/*
 * Every `data-qa` hook of the styleguide, in page order. The Playwright specs and the visual
 * comparison script (`[data-qa="<id>"]`, 1440 and 390) import this list; tests/unit/styleguide.test.ts
 * checks that each id is written once as a `data-qa="…"` literal in sections/*.tsx.
 *
 * Naming: `<component>-<variant>[-<state>]`, kebab-case. A `data-qa` element holds the component
 * example only (the caption sits outside it), so a screenshot of it is the bare component.
 */

const BUTTON_VARIANTS = [
  "pill",
  "primary",
  "light",
  "outline",
  "graphite",
  "save",
] as const;
const STATES = ["default", "hover", "focus", "pressed", "disabled"] as const;
const DIRECTIONS = ["prev", "next"] as const;
const PLAIN_ICONS = ["search", "bag", "heart", "menu", "close"] as const;
const PRODUCT_STATES = ["default", "hover", "focus", "pressed"] as const;
const SHOWCASE_TYPES = ["product", "promo", "work"] as const;
const LAYOUTS = ["desktop", "mobile"] as const;
const CARD_STATES = ["hover", "focus", "pressed"] as const;

export const QA_IDS = [
  // Tokens
  "tokens-colors",
  "tokens-type",
  "tokens-effects",
  // Buttons
  ...BUTTON_VARIANTS.flatMap((variant) =>
    STATES.map((state) => `button-${variant}-${state}` as const),
  ),
  "button-primary-loading",
  "button-primary-link",
  "button-long-label",
  ...PLAIN_ICONS.map((icon) => `icon-button-glass-${icon}` as const),
  ...STATES.map((state) => `icon-button-glass-user-${state}` as const),
  ...STATES.map((state) => `icon-button-light-heart-${state}` as const),
  "icon-button-light-heart-favorite",
  ...DIRECTIONS.flatMap((direction) =>
    STATES.map((state) => `carousel-arrow-${direction}-${state}` as const),
  ),
  ...STATES.map((state) => `social-button-tg-${state}` as const),
  "social-button-vk-default",
  "social-button-ig-default",
  "social-button-wa-default",
  // Forms
  "text-field-dark-default",
  "text-field-dark-focus",
  "text-field-dark-error",
  "text-field-dark-disabled",
  "text-field-light-default",
  "text-field-light-focus",
  "text-field-light-error",
  "text-field-light-disabled",
  "text-field-light-unit",
  "search-field-light-default",
  "search-field-light-hover",
  "search-field-light-focus",
  "search-field-light-disabled",
  "search-field-graphite-default",
  "select-closed",
  "select-hover",
  "select-focus",
  "select-open",
  "select-disabled",
  "badge-discount",
  // Cards
  ...PRODUCT_STATES.map((state) => `product-card-${state}` as const),
  "product-card-discount",
  "product-card-favorite",
  "product-card-no-image",
  "product-card-long-name",
  ...SHOWCASE_TYPES.flatMap((type) =>
    LAYOUTS.map((layout) => `showcase-card-${type}-${layout}` as const),
  ),
  ...CARD_STATES.map(
    (state) => `showcase-card-promo-desktop-${state}` as const,
  ),
  ...CARD_STATES.map((state) => `showcase-card-work-desktop-${state}` as const),
  // Navigation
  "site-header-desktop",
  "site-header-compact",
  "mobile-menu-trigger",
  "nav-pill-default",
  "nav-pill-hover",
  "nav-pill-focus",
  "nav-pill-pressed",
  "nav-pill-current",
  "nav-pill-disabled",
  "nav-pill-long-label",
  "language-switch",
  "tab-bar-current-catalog",
  "tab-bar-none",
  "site-footer",
  "breadcrumb-default",
  "breadcrumb-long",
  // Approval
  "approval-fonts",
  "approval-language-switch",
  "approval-loading-button",
  "approval-glass",
  "approval-checklist",
] as const;

export type QaId = (typeof QA_IDS)[number];
