#!/usr/bin/env node
// Repeatable load test for url-management-service + redirect-service.
// Usage:  npm run loadtest   (from backend/, with both services + docker compose already running)
//
// What it does:
//   1. Checks both services are up.
//   2. Signs in (or signs up, on first run) a dedicated load-test account.
//   3. Creates/reuses one seed short URL and warms its cache entry.
//   4. Runs three autocannon scenarios: redirect (cache hit), list, create.
//   5. Deletes the URLs the "create" scenario generated (keeps the seed).
//   6. Writes a self-contained HTML report to loadtest-reports/.
//
// Config (env vars, all optional):
//   REDIRECT_URL, URL_MGMT_URL   base URLs of the two services
//   DATABASE_URL                 used only to clean up rows the create scenario made
//   DURATION                     seconds per scenario (default 15)
//   CONNECTIONS                  concurrent connections per scenario (default 50)

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import autocannon from "autocannon";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = join(__dirname, "..", "loadtest-reports");

const REDIRECT_URL = process.env.REDIRECT_URL ?? "http://localhost:4000";
const URL_MGMT_URL = process.env.URL_MGMT_URL ?? "http://localhost:3000";
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://fasturl:fasturl@localhost:5434/fasturl";
const DURATION = Number(process.env.DURATION ?? 15);
const CONNECTIONS = Number(process.env.CONNECTIONS ?? 50);

const LOADTEST_EMAIL = "loadtest@fasturl.local";
const LOADTEST_PASSWORD = "LoadTest!2026";
const SEED_ALIAS = "loadtestseed";

// better-auth rejects requests whose Origin header is missing/"null" (Node's
// fetch sends a literal "null" origin for server-side calls like this one),
// so every call to /api/auth/* needs a real Origin matching trustedOrigins.
const AUTH_ORIGIN = "http://localhost:8080";

function log(msg) {
  console.log(`[loadtest] ${msg}`);
}

async function preflight() {
  for (const [name, url] of [
    ["redirect-service", `${REDIRECT_URL}/healthz`],
    ["url-management-service", `${URL_MGMT_URL}/healthz`],
  ]) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error(`status ${res.status}`);
    } catch (err) {
      console.error(
        `\n${name} isn't reachable at ${url} (${err.message}).\n` +
          `Start it first:\n` +
          `  docker compose up -d          # from backend/\n` +
          `  npm run dev:url-management    # from backend/\n` +
          `  npm run dev:redirect          # from backend/\n`
      );
      process.exit(1);
    }
  }
}

async function signInOrSignUp() {
  const signIn = await fetch(`${URL_MGMT_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: AUTH_ORIGIN },
    body: JSON.stringify({ email: LOADTEST_EMAIL, password: LOADTEST_PASSWORD }),
  });
  if (signIn.ok) {
    const data = await signIn.json();
    log(`signed in as ${LOADTEST_EMAIL}`);
    return data;
  }

  const signUp = await fetch(`${URL_MGMT_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: AUTH_ORIGIN },
    body: JSON.stringify({
      email: LOADTEST_EMAIL,
      password: LOADTEST_PASSWORD,
      name: "Load Test",
    }),
  });
  if (!signUp.ok) {
    throw new Error(`could not sign in or sign up load-test account: ${await signUp.text()}`);
  }
  const data = await signUp.json();
  log(`created load-test account ${LOADTEST_EMAIL}`);
  return data;
}

async function seedUrl(token) {
  const create = await fetch(`${URL_MGMT_URL}/api/v1/urls`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      destination: "https://example.com/loadtest-seed",
      customAlias: SEED_ALIAS,
    }),
  });
  if (create.status === 201) {
    log(`created seed URL /${SEED_ALIAS}`);
    return SEED_ALIAS;
  }
  if (create.status === 409) {
    log(`reusing existing seed URL /${SEED_ALIAS}`);
    return SEED_ALIAS;
  }
  throw new Error(`could not seed a URL to redirect against: ${await create.text()}`);
}

async function warmCache(shortCode) {
  await fetch(`${REDIRECT_URL}/${shortCode}`, { redirect: "manual" });
}

async function cleanup(userId) {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM urls WHERE user_id = $1 AND short_code <> $2`,
      [userId, SEED_ALIAS]
    );
    log(`cleaned up ${rowCount} URL(s) created by the "create" scenario`);
  } catch (err) {
    log(`cleanup skipped (${err.message}) — you may want to clear the urls table manually`);
  } finally {
    await pool.end();
  }
}

async function run(name, opts) {
  log(`running "${name}" — ${CONNECTIONS} connections, ${DURATION}s`);
  const result = await autocannon({ connections: CONNECTIONS, duration: DURATION, ...opts });
  return { name, result };
}

function fmt(n, digits = 0) {
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function renderReport(scenarios, meta) {
  const maxRps = Math.max(...scenarios.map((s) => s.result.requests.average));

  const rows = scenarios
    .map(({ name, result: r }) => {
      const expected2xx = name !== "redirect (cache hit)";
      const successPct = expected2xx
        ? (r["2xx"] / (r.requests.total || 1)) * 100
        : (r["3xx"] / (r.requests.total || 1)) * 100;
      const healthy = r.errors === 0 && r.timeouts === 0 && successPct > 99;
      return { name, r, successPct, healthy };
    });

  const scenarioCards = rows
    .map(
      ({ name, r, successPct, healthy }) => `
    <div class="card">
      <div class="card-head">
        <h3>${name}</h3>
        <span class="badge ${healthy ? "ok" : "bad"}">${healthy ? "Healthy" : "Check errors"}</span>
      </div>
      <div class="metric-grid">
        <div class="metric"><span class="v num">${fmt(r.requests.average)}</span><span class="l">req/s avg</span></div>
        <div class="metric"><span class="v num">${fmt(r.latency.p50, 1)} ms</span><span class="l">latency p50</span></div>
        <div class="metric"><span class="v num">${fmt(r.latency.p99, 1)} ms</span><span class="l">latency p99</span></div>
        <div class="metric"><span class="v num">${fmt(r.latency.max, 1)} ms</span><span class="l">latency max</span></div>
        <div class="metric"><span class="v num">${fmt(r.requests.total)}</span><span class="l">total requests</span></div>
        <div class="metric"><span class="v num">${fmt(successPct, 1)}%</span><span class="l">success rate</span></div>
        <div class="metric"><span class="v num">${fmt(r.errors)}</span><span class="l">errors</span></div>
        <div class="metric"><span class="v num">${fmt(r.timeouts)}</span><span class="l">timeouts</span></div>
      </div>
      <details>
        <summary>Raw autocannon result</summary>
        <pre><code>${JSON.stringify(r, null, 2)}</code></pre>
      </details>
    </div>`
    )
    .join("\n");

  const bars = rows
    .map(
      ({ name, r }) => `
    <div class="bar-row">
      <span class="name">${name}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${((r.requests.average / maxRps) * 100).toFixed(1)}%"></div></div>
      <span class="val num">${fmt(r.requests.average)}/s</span>
    </div>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FastUrl load test — ${meta.timestamp}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<style>
  :root{
    --bg:#F4F6F8; --surface:#FFFFFF; --surface-2:#EBEEF2; --ink:#12161D; --ink-muted:#565F6D;
    --border:#DCE1E7; --accent:#166569; --accent-ink:#0E4A4D; --ok:#2F6B45; --ok-bg:#E7F2EA;
    --bad:#A02A22; --bad-bg:#FBEAE8;
  }
  @media (prefers-color-scheme: dark){
    :root{
      --bg:#0E1216; --surface:#161B21; --surface-2:#1E242C; --ink:#E7EAEF; --ink-muted:#9AA3B2;
      --border:#2A313B; --accent:#4FCBCF; --accent-ink:#8FE0E2; --ok:#8FCE9F; --ok-bg:#17321F;
      --bad:#F0847A; --bad-bg:#3A1D1B;
    }
  }
  *{box-sizing:border-box;}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:"IBM Plex Sans",ui-sans-serif,system-ui,sans-serif;line-height:1.55;}
  .page{max-width:900px;margin:0 auto;padding:48px 24px 80px;}
  code,.mono,.num{font-family:"IBM Plex Mono",ui-monospace,"SF Mono",monospace;}
  .num{font-variant-numeric:tabular-nums;}
  header{border-bottom:1px solid var(--border);padding-bottom:24px;margin-bottom:32px;}
  .eyebrow{font-family:"IBM Plex Mono",monospace;font-size:0.76rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--accent-ink);margin:0 0 8px;}
  h1{font-size:1.9rem;font-weight:700;letter-spacing:-0.01em;margin:0 0 10px;text-wrap:balance;}
  .meta{display:flex;flex-wrap:wrap;gap:6px 24px;font-size:0.84rem;color:var(--ink-muted);}
  .meta strong{color:var(--ink);font-weight:600;}
  h2{font-size:1.2rem;font-weight:700;margin:40px 0 14px;}
  .cards{display:flex;flex-direction:column;gap:16px;}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:18px 20px;}
  .card-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
  .card-head h3{margin:0;font-size:1.02rem;font-weight:600;}
  .badge{font-family:"IBM Plex Mono",monospace;font-size:0.7rem;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;padding:3px 9px;border-radius:99px;}
  .badge.ok{color:var(--ok);background:var(--ok-bg);}
  .badge.bad{color:var(--bad);background:var(--bad-bg);}
  .metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
  .metric{background:var(--surface-2);border-radius:8px;padding:10px 12px;}
  .metric .v{display:block;font-size:1.15rem;font-weight:600;}
  .metric .l{font-size:0.7rem;letter-spacing:0.04em;text-transform:uppercase;color:var(--ink-muted);}
  @media (max-width:640px){.metric-grid{grid-template-columns:repeat(2,1fr);}}
  details{margin-top:14px;}
  summary{cursor:pointer;font-size:0.82rem;color:var(--ink-muted);}
  pre{background:var(--surface-2);border:1px solid var(--border);border-radius:7px;padding:12px 14px;overflow-x:auto;font-size:0.76rem;margin-top:8px;}
  .bar-row{display:grid;grid-template-columns:200px 1fr 100px;align-items:center;gap:12px;margin-bottom:10px;font-size:0.86rem;}
  .bar-track{background:var(--surface-2);border-radius:5px;height:14px;overflow:hidden;border:1px solid var(--border);}
  .bar-fill{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent-ink));}
  .bar-row .val{text-align:right;color:var(--ink-muted);}
  footer{margin-top:56px;padding-top:18px;border-top:1px solid var(--border);color:var(--ink-muted);font-size:0.8rem;}
</style>
</head>
<body>
<div class="page">
  <header>
    <p class="eyebrow">Load test report</p>
    <h1>FastUrl backend load test</h1>
    <div class="meta">
      <span><strong>Run</strong> ${meta.timestamp}</span>
      <span><strong>Connections</strong> ${CONNECTIONS}</span>
      <span><strong>Duration</strong> ${DURATION}s / scenario</span>
      <span><strong>Node</strong> ${process.version}</span>
    </div>
  </header>

  <h2>Throughput</h2>
  <div class="bars">${bars}</div>

  <h2>Scenarios</h2>
  <div class="cards">${scenarioCards}</div>

  <footer>Generated by backend/scripts/loadtest.mjs · ${REDIRECT_URL} · ${URL_MGMT_URL}</footer>
</div>
</body>
</html>`;
}

async function main() {
  await preflight();

  const { token, user } = await signInOrSignUp();
  const shortCode = await seedUrl(token);
  await warmCache(shortCode);

  const scenarios = [];

  scenarios.push(
    await run("redirect (cache hit)", {
      url: `${REDIRECT_URL}/${shortCode}`,
      method: "GET",
    })
  );

  scenarios.push(
    await run("list (authenticated)", {
      url: `${URL_MGMT_URL}/api/v1/urls`,
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
    })
  );

  scenarios.push(
    await run("create (authenticated)", {
      url: `${URL_MGMT_URL}/api/v1/urls`,
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ destination: "https://example.com/loadtest" }),
    })
  );

  await cleanup(user.id);

  mkdirSync(REPORT_DIR, { recursive: true });
  const timestamp = new Date().toISOString();
  const html = renderReport(scenarios, { timestamp });

  const stamped = join(REPORT_DIR, `${timestamp.replace(/[:.]/g, "-")}.html`);
  const latest = join(REPORT_DIR, "latest.html");
  writeFileSync(stamped, html);
  writeFileSync(latest, html);

  log(`report written to ${stamped}`);
  log(`report written to ${latest}`);
}

main().catch((err) => {
  console.error(`\n[loadtest] failed: ${err.message}`);
  process.exit(1);
});
