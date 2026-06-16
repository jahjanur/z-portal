// Authenticated screenshot via Chrome DevTools Protocol (Node 22 global WebSocket).
// Usage: node shot-auth.mjs <token> <route> <outPath> [height]
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const [, , TOKEN, ROUTE, OUT, HEIGHT = "2200", CLICK_TEXT, SCROLL_Y, WIDTH = "1440"] = process.argv;
const MOBILE = Number(WIDTH) <= 600;
const PORT = 9333;
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ORIGIN = "http://localhost:5174";

const chrome = spawn(CHROME, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run",
  "--hide-scrollbars", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${process.env.TEMP}/zp-cdp-${Date.now()}`,
  `--window-size=${WIDTH},${HEIGHT}`, "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(path) {
  const res = await fetch(`http://127.0.0.1:${PORT}${path}`);
  return res.json();
}

let nextId = 1;
function send(ws, method, params, sessionId) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params, sessionId }));
  return new Promise((resolve) => {
    const onMsg = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id === id) {
        ws.removeEventListener("message", onMsg);
        if (msg.error) console.log("CDP ERR", method, JSON.stringify(msg.error));
        resolve(msg.result);
      }
    };
    ws.addEventListener("message", onMsg);
  });
}

try {
  // wait for devtools
  let version;
  for (let i = 0; i < 40; i++) {
    try { version = await getJSON("/json/version"); break; } catch { await sleep(250); }
  }
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));

  const { targetId } = await send(ws, "Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send(ws, "Target.attachToTarget", { targetId, flatten: true });

  await send(ws, "Page.enable", {}, sessionId);
  await send(ws, "Runtime.enable", {}, sessionId);

  if (MOBILE) {
    await send(ws, "Emulation.setDeviceMetricsOverride", {
      width: Number(WIDTH), height: Number(HEIGHT), deviceScaleFactor: 2, mobile: true,
    }, sessionId);
    await send(ws, "Emulation.setTouchEmulationEnabled", { enabled: true }, sessionId);
  }

  // Inject auth into localStorage BEFORE any page script runs.
  const inject = `try{localStorage.setItem('token',${JSON.stringify(TOKEN)});localStorage.setItem('role','ADMIN');localStorage.setItem('name','Admin User');localStorage.setItem('userId','1');localStorage.setItem('theme','dark');}catch(e){}`;
  await send(ws, "Page.addScriptToEvaluateOnNewDocument", { source: inject }, sessionId);

  const nav = await send(ws, "Page.navigate", { url: `${ORIGIN}${ROUTE}` }, sessionId);
  console.log("nav:", JSON.stringify(nav));
  await sleep(4000); // let data load + charts render

  const probe = await send(ws, "Runtime.evaluate", { expression: "location.href", returnByValue: true }, sessionId);
  console.log("at:", probe?.result?.value);

  if (CLICK_TEXT) {
    const clicked = await send(ws, "Runtime.evaluate", {
      expression: `(()=>{const q=${JSON.stringify(CLICK_TEXT)};const els=[...document.querySelectorAll('button,a')];const el=els.find(e=>e.textContent.trim().includes(q)||(e.getAttribute('aria-label')||'').includes(q));if(el){el.click();return true;}return false;})()`,
      returnByValue: true,
    }, sessionId);
    console.log("clicked:", clicked?.result?.value);
    await sleep(1200);
  }

  let beyond = true;
  if (SCROLL_Y) {
    await send(ws, "Runtime.evaluate", { expression: `window.scrollTo(0, ${Number(SCROLL_Y)})` }, sessionId);
    await sleep(700);
    beyond = false; // capture only the viewport at the scrolled position
  }

  const { data } = await send(ws, "Page.captureScreenshot", { format: "png", captureBeyondViewport: beyond }, sessionId);
  writeFileSync(OUT, Buffer.from(data, "base64"));
  console.log("OK", OUT);
} catch (e) {
  console.error("ERR", e?.message || e);
} finally {
  chrome.kill();
  process.exit(0);
}
