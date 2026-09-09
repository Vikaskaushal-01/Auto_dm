export const DEMO_USER_EMAIL = "demo@autodm.app";
export const DEMO_USER_PASSWORD = "Demo1234!";
export const DEMO_WORKSPACE_SLUG = "demo-creator";
export const DEMO_WORKSPACE_NAME = "Demo Creator Studio";
export const DEMO_IG_USERNAME = "ai.with.aarav";
export const DEMO_IG_DISPLAY_NAME = "Aarav | AI for Creators";

// Fixed seed so seed scripts always produce
// identical demo data — reproducible for screenshots/manual testing.
export const RANDOM_SEED = 42;

/** Mulberry32 PRNG — small, fast, deterministic given a fixed seed. */
export function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
