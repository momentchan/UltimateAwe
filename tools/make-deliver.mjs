/**
 * Build a LAN handoff folder for Unity / exhibition:
 *   deliver/
 *     README.md      — setup guide (from tools/deliver-README.md)
 *     app/           — static build (dist)
 *     relay/         — WebSocket relay + package.json
 *
 * Usage: node tools/make-deliver.mjs
 */
import { cpSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const out = resolve(root, "deliver");

console.log("[deliver] building web app…");
execSync("npm run build", { cwd: root, stdio: "inherit" });

rmSync(out, { recursive: true, force: true });
mkdirSync(resolve(out, "app"), { recursive: true });
mkdirSync(resolve(out, "relay"), { recursive: true });

cpSync(resolve(root, "dist"), resolve(out, "app"), { recursive: true });
cpSync(
  resolve(root, "tools/signal-relay/server.mjs"),
  resolve(out, "relay/server.mjs"),
);
cpSync(resolve(__dirname, "deliver-README.md"), resolve(out, "README.md"));

writeFileSync(
  resolve(out, "relay/package.json"),
  JSON.stringify(
    {
      name: "ultimate-awe-signal-relay",
      private: true,
      type: "module",
      scripts: {
        start: "node server.mjs",
      },
      dependencies: {
        ws: "^8.21.1",
      },
    },
    null,
    2,
  ) + "\n",
);

writeFileSync(
  resolve(out, "package.json"),
  JSON.stringify(
    {
      name: "ultimate-awe-deliver",
      private: true,
      type: "module",
      scripts: {
        relay: "npm --prefix relay start",
        "relay:install": "npm --prefix relay install",
        app: "npx --yes serve app -l 4173 -s",
      },
    },
    null,
    2,
  ) + "\n",
);

writeFileSync(
  resolve(out, "PROTOCOL.txt"),
  `Ultimate a-We — signal protocol
================================

Connect (WebSocket client):
  ws://<DISPLAY_PC_LAN_IP>:8765

Send text JSON frames:
  {"op":"add","typeId":"absorb","n":1,"id":"unique-id"}

typeId (required): absorb | reflect | withdraw | transform | diffuse
n (optional): integer >= 1, default 1
id (optional): dedupe key

Relay broadcasts each message to all OTHER connected clients.
`,
  "utf8",
);

console.log("[deliver] ready →", out);
