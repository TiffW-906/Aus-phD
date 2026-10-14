import vinext from "vinext";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { readExecutionProfile } from "./scripts/execution-profile.mjs";
import { connectorPreview } from "./build/connector-preview-plugin.mjs";

// Local dev uses this placeholder; deploys pass the real D1 database ID in
// D1_DATABASE_ID (see START_HERE.zh-TW.md and .github/workflows/deploy.yml).
const PLACEHOLDER_DATABASE_ID = "00000000-0000-4000-8000-000000000000";
const WORKER_NAME = process.env.WORKER_NAME || "au-phd-2028";
const DATABASE_NAME = process.env.D1_DATABASE_NAME || "au-phd-2028";
const d1 = "DB";
const r2: string | null = null;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
const managedLinux = readExecutionProfile() === "managed-linux";

const localBindingConfig = {
  name: WORKER_NAME,
  main: "./build/sites-worker.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: DATABASE_NAME,
          database_id: process.env.D1_DATABASE_ID || PLACEHOLDER_DATABASE_ID,
          migrations_dir: fileURLToPath(new URL("./drizzle", import.meta.url)),
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
  // Cloudflare Access settings baked into the deployed Worker. Empty values make
  // every production request fail closed (401) until they are configured.
  vars: {
    ACCESS_TEAM_DOMAIN: process.env.ACCESS_TEAM_DOMAIN ?? "",
    ACCESS_AUD: process.env.ACCESS_AUD ?? "",
    OWNER_EMAILS: process.env.OWNER_EMAILS ?? "",
  },
};

export default defineConfig(async ({ command }) => {
  // Use Miniflare's local Request.cf placeholder unless fetching is requested.
  process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= "false";
  process.env.WRANGLER_SEND_METRICS ??= "false";

  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.WRANGLER_REGISTRY_PATH ??= ".wrangler/dev-registry";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: {
      ...(managedLinux
        ? { host: "0.0.0.0", allowedHosts: ["terminal.local"] }
        : {}),
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
    },
    plugins: [
      vinext(),
      connectorPreview(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: {
          ...localBindingConfig,
          ...(command === "serve"
            ? {
                services: [
                  {
                    binding: "CONNECTORS",
                    service: "sites-connector-preview",
                    entrypoint: "ConnectorPreview",
                  },
                ],
              }
            : {}),
        },
        ...(command === "serve"
          ? {
              auxiliaryWorkers: [
                {
                  config: {
                    name: "sites-connector-preview",
                    main: "./build/connector-preview-worker.mjs",
                    compatibility_date: "2026-05-15",
                  },
                },
              ],
            }
          : {}),
      }),
    ],
  };
});
