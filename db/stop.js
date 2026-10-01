// Stops the local dev Postgres cluster. Usage: node db/stop.js
const { spawnSync } = require("child_process");
const path = require("path");
const os = require("os");

const bin = "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_ctl.exe";
const dir = path.join(os.homedir(), "AppData", "Local", "mofe-pgdata");

const r = spawnSync(bin, ["-D", dir, "stop"], { stdio: "inherit" });
process.exit(r.status ?? 1);
