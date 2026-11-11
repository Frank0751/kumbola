import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * KumBola uses no ISR/revalidate routes, so the default (no-op) incremental
 * cache is sufficient. If ISR is ever introduced, add an R2 or KV override:
 *   import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
 *   export default defineCloudflareConfig({ incrementalCache: r2IncrementalCache });
 */
export default defineCloudflareConfig();
