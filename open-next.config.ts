import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Defaults: no incremental cache needed (all pages are dynamic and per-user).
export default defineCloudflareConfig();
