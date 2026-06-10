import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const cwd = process.cwd().replace(/^([a-z]):/, (_, drive) => `${drive.toUpperCase()}:`);
const vitestBin = fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url))
  .replace(/^([a-z]):/, (_, drive) => `${drive.toUpperCase()}:`);
const child = spawn(process.execPath, [vitestBin, ...process.argv.slice(2)], {
  cwd,
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
