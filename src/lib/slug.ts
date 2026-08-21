export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Same character normalization as slugify(), but leaves a trailing hyphen
 * in place. Use this for a controlled input's onChange while the user is
 * actively typing a slug by hand - slugify() strips trailing hyphens,
 * which (re-run on every keystroke) silently eats a "-" the moment it's
 * typed, before the next character arrives. Final validation still
 * rejects a slug that ends up with a trailing hyphen at submit time.
 */
export function slugifyLive(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
}
