// Rewritten in place right before `encore build docker` compiles -- see
// the "Resolve app version" step in .github/workflows/docker.yml (CI
// builds) and scripts/build.sh (local builds), which sed this string to
// the actual git tag/sha and restore it afterward. Baked into the compiled
// bundle at build time rather than read from an env var at runtime, so the
// image is self-describing regardless of how it's deployed -- no compose
// var to remember to keep in sync with the tag actually running.
export const APP_VERSION = "dev";
