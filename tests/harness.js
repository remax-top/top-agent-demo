/* Жижиг шалгалтын хэрэгсэл — npm, package.json шаардахгүй.
   Ажиллуулах:  NODE_PATH=$(npm root -g) node tests/run.js
   (глобал `playwright` хэрэгтэй; Chromium-ийг PLAYWRIGHT_BROWSERS_PATH эсвэл playwright install-аар) */
const path = require("path");
const { chromium } = require("playwright");

const FILE = "file://" + path.resolve(__dirname, "..", "index.html");
const results = [];

async function newPage(browser, opts) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 } }, opts || {}));
  const page = await ctx.newPage();
  page.__errors = [];
  page.on("pageerror", e => page.__errors.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto(FILE + "#/login");
  /* Хиймэл сүлжээний саатлыг (300–600 мс) тестэд арилгана */
  await page.evaluate(() => { window.wait = () => Promise.resolve(); });
  await page.waitForSelector("#screen .topbar");
  return page;
}
/* Хэрэглэгч солих: session + hash, дэлгэц зурагдтал хүлээнэ */
async function as(page, agentId, hash, sel) {
  await page.evaluate(([id, h]) => { S.session = id; S.flow = null; if (location.hash === h) route(); else location.hash = h; }, [agentId, hash]);
  if (sel) await page.waitForSelector(sel);
  await page.waitForTimeout(60);
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function eq(a, b, msg) { if (a !== b) throw new Error((msg || "") + " — хүлээсэн " + JSON.stringify(b) + ", гарсан " + JSON.stringify(a)); }

async function check(group, name, browser, fn, opts) {
  const page = await newPage(browser, opts);
  const t0 = Date.now();
  try {
    await fn(page);
    if (page.__errors.length) throw new Error("JS алдаа: " + page.__errors.join(" | "));
    results.push({ group, name, ok: true, ms: Date.now() - t0 });
    console.log("  ✓ " + name);
  } catch (e) {
    results.push({ group, name, ok: false, err: e.message });
    console.log("  ✕ " + name + "\n      " + e.message.split("\n")[0]);
  } finally {
    await page.context().close();
  }
}

module.exports = { chromium, FILE, newPage, as, assert, eq, check, results };
