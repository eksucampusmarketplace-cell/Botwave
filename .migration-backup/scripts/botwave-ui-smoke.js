const fs = require("fs");
const { spawnSync } = require("child_process");

const url = process.env.BOTWAVE_UI_URL || "http://host.docker.internal:3000/";
const outDir = process.env.UI_TEST_OUT_DIR || "/opt/workspace_base/ui-test-artifacts";
fs.mkdirSync(outDir, { recursive: true });

function run(args) {
  const result = spawnSync("chromium", args, {
    encoding: "utf8",
    timeout: 30000,
  });
  return {
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

const screenshot = `${outDir}/botwave-home.png`;
const dom = `${outDir}/botwave-home.dom.txt`;

const shot = run([
  "--headless=new",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--ignore-certificate-errors",
  `--screenshot=${screenshot}`,
  "--window-size=1440,1000",
  url,
]);

const dump = run([
  "--headless=new",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--ignore-certificate-errors",
  "--dump-dom",
  url,
]);
fs.writeFileSync(dom, dump.stdout + "\n--- STDERR ---\n" + dump.stderr);

const ok =
  shot.status === 0 &&
  fs.existsSync(screenshot) &&
  dump.status === 0 &&
  /<html|<body|Botwave|BotWave|botwave/i.test(dump.stdout);

const result = {
  ok,
  url,
  screenshot,
  dom,
  screenshotExit: shot.status,
  domExit: dump.status,
  domChars: dump.stdout.length,
  screenshotStderrTail: shot.stderr.slice(-1000),
  domStderrTail: dump.stderr.slice(-1000),
};

console.log(JSON.stringify(result, null, 2));
process.exit(ok ? 0 : 1);
