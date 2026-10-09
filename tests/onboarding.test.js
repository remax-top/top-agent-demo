/* v6 — онбординг «REMAX TOP хот»: 12 шалгалт (даалгаврын баримтын «Шалгалт» хэсэг) */
const { as, assert, eq, check } = require("./harness");

const TEM = "119038213", NAN = "119038214", MENTOR = "119038201", MGR = "119038207", OTHER = "119038203";
const coin = (p, id) => p.evaluate(id => onbBalance(id), id);
const st = (p, id, code) => p.evaluate(([id, c]) => onbState(onbT(id), c), [id, code]);

/* Тестийн бэлтгэл: алхмыг жинхэнэ api-аар (илгээх → батлагчаар батлах) дуусгана */
async function complete(page, tid, codes) {
  return page.evaluate(async ([tid, codes]) => {
    const t = onbT(tid), keep = S.session;
    function payload(d) {
      if (d.kind === "form") { const p = {}; d.fields.forEach(f => p[f.k] = f.k === "district" ? "Баянзүрх" : (f.k === "med" ? "3.6" : "тест")); return p; }
      if (d.kind === "file") return { file: { name: "test.pdf", size: 2048, type: "application/pdf" } };
      if (d.kind === "sign") return { png: "data:image/png;base64,AAAA" };
      if (d.code === "D3_CONTRACT") return { answers: [1, 0, 0, 0, 0] };
      if (d.code === "D4_VOCAB") return { seen: ONB_VOCAB.length };
      return {};
    }
    for (const code of codes) {
      const d = onbDef(code);
      if (onbRaw(t, code) === "DONE") continue;
      if (onbRaw(t, code) !== "SUBMITTED") {
        S.session = tid; const r = await api.onbSubmit(code, payload(d));
        if (!r.ok) throw new Error(code + ": " + r.err);
      }
      if (d.approver !== "AUTO") {
        S.session = d.approver === "ADMIN" ? "119038207" : t.mentor;
        const r = await api.onbReview(tid, code, "APPROVE");
        if (!r.ok) throw new Error(code + " батлах: " + r.err);
      }
    }
    S.session = keep;
  }, [tid, codes]);
}
const stepsOf = (p, locs) => p.evaluate(locs => ONB_LOCS.filter(l => locs.includes(l.n)).flatMap(l => l.steps.map(s => s.code)), locs);
const pct = x => (x / 390 * 100).toFixed(3) + "%";

module.exports = async function (browser) {
  const G = "Онбординг v6";
  console.log("\n" + G);

  await check(G, "1. Дүр сонгоогүй дадлагажигч #/onb → #/onb/select; сонгоход хот дээр тэр дүр", browser, async p => {
    await as(p, NAN, "#/onb");
    await p.waitForFunction(() => location.hash === "#/onb/select");
    await p.waitForSelector(".onb-chars");
    eq(await p.locator(".onb-char-btn").count(), 6, "6 дүр");
    await p.click('[data-act="pick:4"]');
    eq(await p.getAttribute('[data-act="pick:4"]', "aria-pressed"), "true", "сонгосон дүр");
    await p.fill("#heroName", "Нандин");
    await p.click('[data-act="enter"]');
    await p.waitForSelector(".city .city-char");
    eq(await p.evaluate(() => location.hash), "#/onb");
    eq(await p.getAttribute(".city-char", "data-char-idx"), "4", "хот дээрх дүр");
    eq((await p.textContent(".onb-name")).trim(), "Нандин", "дүрийн нэр");
  });

  await check(G, "2. Хот: 7 байршил + төгсөлт + 30 хоног; DONE / одоогийн / LOCKED тоо демотой таарна", browser, async p => {
    await as(p, TEM, "#/onb", ".city .city-char");
    const pins = await p.$$eval("[data-onb-loc]", els => els.map(e => [e.getAttribute("data-onb-loc"), e.getAttribute("data-state")]));
    const cur = await p.getAttribute(".city-char", "data-onb-char");
    const all = pins.map(x => x[0]).concat([cur]).sort((a, b) => a - b);
    eq(all.join(","), "1,2,3,4,5,6,7,8,30", "9 тэмдэг");
    eq(pins.filter(x => x[1] === "done").length, 2, "DONE");
    eq(cur, "3", "одоогийн байршил");
    eq(pins.filter(x => x[1] === "locked").length, 6, "LOCKED");
    eq((await p.textContent("[data-coin]")).trim(), "7", "coin");
  });

  await check(G, "3. LOCKED байршил дээр дарахад даалгавар нээгдэхгүй", browser, async p => {
    await as(p, TEM, "#/onb", ".city .city-char");
    await p.click('[data-onb-loc="4"]');
    await p.waitForTimeout(150);
    eq(await p.evaluate(() => location.hash), "#/onb", "hash хэвээр");
    eq(await p.locator(".st-card").count(), 0, "даалгавар нээгдээгүй");
    await p.evaluate(() => { location.hash = "#/onb/loc/5"; });
    await p.waitForFunction(() => location.hash === "#/onb");
    await p.waitForSelector(".city .city-char");
    eq(await p.locator(".st-card").count(), 0, "шууд hash-аар ч нээгдэхгүй");
  });

  await check(G, "4. D3_CONTRACT 5/5 → +1 +2 coin, DONE; 4/5 → +1, бонусгүй", browser, async p => {
    async function quiz(answers) {
      await as(p, TEM, "#/onb/loc/3", '[data-step="D3_CONTRACT"] .quiz');
      for (const a of answers) { await p.click('[data-act="ans:' + a + '"]'); await p.click('[data-act="qnext"]'); }
      await p.waitForSelector('[data-step="D3_CONTRACT"][data-st="DONE"]');
    }
    await quiz([1, 0, 0, 0, 0]);
    eq(await coin(p, TEM), 10, "5/5: 7 + 1 + 2");
    eq(await st(p, TEM, "D3_CONTRACT"), "DONE");
    await p.evaluate(() => DEMO_ACT.reset());
    await quiz([0, 0, 0, 0, 0]);
    eq(await coin(p, TEM), 8, "4/5: 7 + 1");
    eq(await p.evaluate(() => onbT("119038213").steps.D3_CONTRACT.score), 4, "оноо");
  });

  await check(G, "5. MENTOR алхам илгээхэд SUBMITTED, coin нэмэгдэхгүй; ментор батлахад +1, DONE", browser, async p => {
    await p.evaluate(() => { onbT("119038214").char = { idx: 1, name: "" }; });
    await as(p, NAN, "#/onb/loc/2", '[data-step="D2_WHY"] textarea');
    await p.fill("#f_D2_WHY_why", "Хүмүүст орон сууц олоход туслах");
    await p.click('[data-act="sub:D2_WHY"]');
    await p.waitForSelector('[data-step="D2_WHY"][data-st="SUBMITTED"]');
    eq(await coin(p, NAN), 3, "илгээхэд coin орохгүй");
    await as(p, MENTOR, "#/mentor", '[data-review="' + NAN + '|D2_WHY"]');
    await p.click('[data-review="' + NAN + '|D2_WHY"] .btn.ok');
    await p.waitForSelector('[data-review="' + NAN + '|D2_WHY"]', { state: "detached" });
    eq(await coin(p, NAN), 4, "батлахад +1");
    eq(await st(p, NAN, "D2_WHY"), "DONE");
  });

  await check(G, "6. Ментор «Буцаах» шалтгаантай → RETURNED, шалтгаан харагдана, дахин илгээнэ", browser, async p => {
    await p.evaluate(() => { onbT("119038214").char = { idx: 1, name: "" }; });
    await as(p, MENTOR, "#/mentor", '[data-review="' + NAN + '|D2_SWOT"]');
    await p.click('[data-review="' + NAN + '|D2_SWOT"] .btn.ghost');
    await p.fill("#rvWhy", "Сул талаа тодорхой жишээгээр бичээрэй");
    await p.click('[data-act="rvSend"]');
    await p.waitForSelector('[data-review="' + NAN + '|D2_SWOT"]', { state: "detached" });
    eq(await st(p, NAN, "D2_SWOT"), "RETURNED");
    await as(p, NAN, "#/onb/loc/2", '[data-step="D2_SWOT"][data-st="RETURNED"]');
    assert((await p.textContent('[data-step="D2_SWOT"] [data-reason]')).includes("Сул талаа тодорхой жишээгээр"), "шалтгаан харагдана");
    for (const k of ["s", "w", "o", "t"]) await p.fill("#f_D2_SWOT_" + k, "засварласан " + k);
    await p.click('[data-act="sub:D2_SWOT"]');
    await p.waitForSelector('[data-step="D2_SWOT"][data-st="SUBMITTED"]');
    eq(await coin(p, NAN), 3, "дахин илгээхэд ч coin орохгүй");
  });

  await check(G, "7. Эрх: дадлагажигч onbReview дуудахад, ментор өөр хүний дадлагажигчийг батлахад татгалзана", browser, async p => {
    const r = await p.evaluate(async ([NAN, TEM, OTHER, MENTOR, MGR]) => {
      const out = {};
      S.session = NAN; out.self = await api.onbReview(NAN, "D2_SMART", "APPROVE");
      S.session = TEM; out.peer = await api.onbReview(NAN, "D2_SMART", "APPROVE");
      S.session = OTHER; out.other = await api.onbReview(NAN, "D2_SMART", "APPROVE");
      S.session = MENTOR; out.admStep = await api.onbReview(TEM, "D3_ACCESS", "APPROVE");
      S.session = MGR; out.mgrMentorStep = await api.onbReview(NAN, "D2_SMART", "APPROVE");
      S.session = NAN; out.give = await api.onbGiveReward("RW-001");
      out.state = onbState(onbT(NAN), "D2_SMART"); out.coin = onbBalance(NAN);
      return out;
    }, [NAN, TEM, OTHER, MENTOR, MGR]);
    for (const k of ["self", "peer", "other", "admStep", "mgrMentorStep", "give"]) eq(r[k].ok, false, k + " татгалзах ёстой");
    eq(r.state, "SUBMITTED", "төлөв өөрчлөгдөөгүй");
    eq(r.coin, 3, "coin өөрчлөгдөөгүй");
  });

  await check(G, "8. Байршил 3 бүрэн DONE → 4 нээгдэж, дүр 4 руу шилжинэ", browser, async p => {
    await as(p, TEM, "#/onb", ".city .city-char");
    eq(await p.getAttribute(".city-char", "data-onb-char"), "3");
    await complete(p, TEM, ["D3_CONTRACT"]);
    await as(p, MGR, "#/admin", '[data-review="' + TEM + '|D3_ACCESS"]');
    await p.click('[data-review="' + TEM + '|D3_ACCESS"] .btn.ok');
    await p.waitForSelector('[data-review="' + TEM + '|D3_ACCESS"]', { state: "detached" });
    await as(p, TEM, "#/onb", ".city .city-char");
    eq(await p.getAttribute(".city-char", "data-onb-char"), "4", "дүр 4-т");
    eq(await p.getAttribute('[data-onb-loc="3"]', "data-state"), "done", "3 DONE");
    await p.waitForFunction(x => document.querySelector(".city-char").style.left === x, pct(123));
    await p.click(".city-char");
    await p.waitForSelector('[data-step="D4_PRICE"]');
    eq(await p.evaluate(() => location.hash), "#/onb/loc/4", "4-ийн даалгавар нээгдэнэ");
  });

  await check(G, "9. Шагнал: coin хүрэлцэхгүй бол «Авах» идэвхгүй; хүсэлт менежерт, coin суутгагдана, «Олгосон»", browser, async p => {
    await as(p, TEM, "#/onb/rewards", "[data-reward]");
    eq(await p.isDisabled('[data-reward="SHADOW_DAY"] .rew-buy'), true, "10 coin — идэвхгүй");
    eq(await p.isDisabled('[data-reward="CARDS"] .rew-buy'), false, "5 coin — идэвхтэй");
    await p.click('[data-reward="CARDS"] .rew-buy');
    await p.click('[data-act="buyOk"]');
    await p.waitForFunction(() => document.querySelector("[data-balance]") && document.querySelector("[data-balance]").textContent.trim() === "2");
    eq(await p.isDisabled('[data-reward="CARDS"] .rew-buy'), true, "үлдэгдэл 2 — дахин авах боломжгүй");
    await as(p, MGR, "#/admin", '[data-req="RW-001"]');
    await p.click('[data-act="give:RW-001"]');
    await p.waitForSelector('[data-req="RW-001"]', { state: "detached" });
    eq(await p.evaluate(() => S.data.onb.requests[0].status), "GIVEN");
    eq(await p.evaluate(() => S.data.onb.requests[0].given_by), MGR);
    await as(p, TEM, "#/onb/rewards", '[data-reward="CARDS"] .badge.ok');
    eq(await coin(p, TEM), 2, "олгосны дараа ч суутгал хэвээр");
  });

  await check(G, "10. 1–7 бүгд DONE → тэмдэг, +5 coin, 30 хоногийн бүс нээгдэнэ", browser, async p => {
    await complete(p, TEM, await stepsOf(p, [3, 4, 5, 6]));
    const before = await coin(p, TEM);
    eq(await p.evaluate(() => onbT("119038213").graduated), false, "7-р байршлаас өмнө төгсөхгүй");
    await complete(p, TEM, ["D7_PHOTO"]);
    const t = await p.evaluate(() => { const t = onbT("119038213"); return { g: t.graduated, b: t.badge, f: t.fireup }; });
    eq(t.g, true); eq(t.b, "Дадлагажигч агент"); eq(t.f, true, "Fire-Up эрх");
    eq(await coin(p, TEM), before + 1 + 5, "D7 +1, төгсөлт +5");
    await as(p, TEM, "#/onb", ".city .city-char");
    eq(await p.getAttribute('[data-onb-loc="8"]', "data-state"), "done", "төгсөлтийн тэмдэг");
    eq(await p.getAttribute(".city-char", "data-onb-char"), "30", "дүр 30 хоногийн бүсэд");
    await p.click(".city-char");
    await p.waitForSelector('[data-step="M30_VIEWING"]');
  });

  await check(G, "11. Дадлагажигчийн объект Admin Approve → M30_LISTING DONE, дадлагажигч +10, ментор +5", browser, async p => {
    await complete(p, TEM, await stepsOf(p, [3, 4, 5, 6, 7]));
    const c0 = await coin(p, TEM), m0 = await p.evaluate(id => onbEarned(id), MENTOR);
    eq(await st(p, TEM, "M30_LISTING"), "OPEN");
    const r = await p.evaluate(async () => {
      const o = objById("TMP-260921-07"); o.stage = 10;   // листингийн 10-р алхам (Approve) хүртэл явсан гэж үзнэ
      S.session = "119038207"; return api.advance(o.id, "OFFICE");
    });
    eq(r.ok, true, "Admin Approve");
    eq(await st(p, TEM, "M30_LISTING"), "DONE");
    eq(await st(p, TEM, "M30_CONTACT"), "DONE", "1-р алхам дууссан тул холбогдсон гэж тэмдэглэгдэнэ");
    eq(await coin(p, TEM), c0 + 10 + 2, "M30_LISTING +10, M30_CONTACT +2");
    eq(await p.evaluate(id => onbEarned(id), MENTOR), m0 + 5, "ментор +5");
    eq(await p.evaluate(() => S.data.onb.ledger.filter(e => e.step_code === "M30_LISTING" && e.agent_id === "119038213")[0].approved_by), MGR);
  });

  await check(G, "12. 360px хэвтээ гүйлтгүй; товч ≥44px; prefers-reduced-motion үед transition байхгүй", browser, async p => {
    const screens = [[TEM, "#/onb", ".city .city-char"], [TEM, "#/onb/select", ".onb-chars"], [TEM, "#/onb/loc/3", ".st-card"],
                     [TEM, "#/onb/rewards", "[data-reward]"], [MENTOR, "#/mentor", ".rv-card"]];
    for (const [id, h, sel] of screens) {
      await as(p, id, h, sel);
      const m = await p.evaluate(() => {
        const sc = document.getElementById("screen");
        const small = [...document.querySelectorAll("#screen button, #screen a, #nav button")].filter(e => {
          const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44);
        }).map(e => (e.getAttribute("data-act") || e.className || e.textContent).toString().slice(0, 30));
        return { doc: document.documentElement.scrollWidth, scr: sc.scrollWidth - sc.clientWidth, small };
      });
      assert(m.doc <= 360, h + ": хуудас " + m.doc + "px");
      assert(m.scr <= 0, h + ": дэлгэц хэвтээ гүйлттэй (" + m.scr + "px)");
      eq(m.small.join(","), "", h + ": 44px-ээс жижиг товч");
    }
    await as(p, TEM, "#/onb", ".city .city-char");
    eq(await p.evaluate(() => getComputedStyle(document.querySelector(".city-char")).transitionDuration), "0s", "reduced motion");
  }, { viewport: { width: 360, height: 780 }, reducedMotion: "reduce" });
};
