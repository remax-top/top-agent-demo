/* «Өнөөдрийн төлөвлөгөө» — 1-р алхам (docs/onoodriin-tolovlogoo-TD.md): cold call тоолуур, чеклист, Нүүрийн карт */
const { as, assert, eq, check } = require("./harness");

module.exports = async function (browser) {
  const G = "Өнөөдрийн төлөвлөгөө";
  console.log("\n" + G);
  const ACTIVE = "119038201", NEW = "119038212";

  await check(G, "Нүүрийн карт: cold call 6/20, биелэлт → «Өнөөдрийн төлөвлөгөө» нээгдэнэ", browser, async p => {
    await as(p, ACTIVE, "#/home", '[data-act="plan"]');
    const card = await p.textContent('[data-act="plan"]');
    assert(card.includes("Cold call 6/20"), "картад cold call: " + card);
    assert(card.includes("биелэлт 1/8"), "картад биелэлт (7 ажил + cold call): " + card);
    await p.click('[data-act="plan"]');
    await p.waitForSelector("#callsN");
    eq(await p.evaluate(() => location.hash), "#/plan");
    eq(await p.locator('#nav [aria-current="page"]').textContent(), "Нүүр", "доод цэс Нүүр идэвхтэй");
    assert((await p.textContent(".topbar")).includes("Даваа гараг"), "огноо, гараг");
    /* Даваа гараг тул 7 хоногийн тайлан (L4) харагдана */
    assert((await p.textContent("#screen")).includes("Харилцагчдад 7 хоногийн мэдээлэл"), "7 хоногийн ажил");
  });

  await check(G, "Cold call +1 / −1, чеклист тэмдэглэх → өгөгдөл ба биелэлт шинэчлэгдэнэ", browser, async p => {
    await as(p, ACTIVE, "#/plan", "#callsN");
    await p.click('[data-act="callPlus"]'); await p.click('[data-act="callPlus"]');
    await p.waitForFunction(() => planDay("119038201", TODAY).calls_done === 8);
    eq(await p.textContent("#callsN"), "8");
    await p.click('[data-act="callMinus"]');
    await p.waitForFunction(() => planDay("119038201", TODAY).calls_done === 7);
    const b = p.locator('[data-act="tog"][data-id="B1"]');
    eq(await b.getAttribute("aria-checked"), "false");
    await b.click();
    await p.waitForFunction(() => planDay("119038201", TODAY).done_ids.includes("B1"));
    eq(await p.locator('[data-act="tog"][data-id="B1"]').getAttribute("aria-checked"), "true");
    assert((await p.textContent("#planDone")).includes("2/8"), "биелэлт 2/8");
    /* Зорилтод хүрвэл cold call биелсэнд тооцогдоно */
    await p.evaluate(() => { planDay("119038201", TODAY).calls_done = 19; });
    await as(p, ACTIVE, "#/plan", "#callsN");
    await p.click('[data-act="callPlus"]');
    await p.waitForSelector(".calls .badge.ok");
    assert((await p.textContent("#planDone")).includes("3/8"), "биелэлт 3/8");
  });

  await check(G, "Шинэ агент: зорилтгүй → «Зорилт тавих» → 09:30, 15 дуудлага хадгалагдана", browser, async p => {
    await as(p, NEW, "#/home", '[data-act="plan"]');
    assert((await p.textContent('[data-act="plan"]')).includes("Cold call-ын зорилт тавиагүй"), "карт");
    await as(p, NEW, "#/plan", '[data-act="target"]');
    eq(await p.locator("#callsN").count(), 0, "зорилтгүй үед тоолуур харагдахгүй");
    await p.click('[data-act="target"]');
    await p.waitForSelector("#ptgt");
    await p.fill("#ptgt", "0"); await p.click('[data-act="saveTarget"]');
    await p.waitForFunction(() => document.querySelector("#perr").textContent.includes("1–200"));
    await p.fill("#ptime", "09:30"); await p.fill("#ptgt", "15"); await p.click('[data-act="saveTarget"]');
    await p.waitForSelector("#callsN");
    eq(await p.evaluate(() => JSON.stringify([planTpl("119038212").call_time, planTpl("119038212").call_target])), '["09:30",15]');
    assert((await p.textContent(".primary-block")).includes("09:30-аас · зорилт 15"), "зорилт харагдана");
  });

  await check(G, "Жагсаалт засах: нэмэх, гараг солих (өнөөдөр нуугдана), хасах", browser, async p => {
    await as(p, ACTIVE, "#/plan", "#callsN");
    await p.click('[data-act="edit"]');
    await p.waitForSelector("#pnew");
    await p.fill("#pnew", "Хуучин харилцагчдаа мэндчилгээ илгээх");
    await p.click('[data-act="add"]');
    await p.waitForFunction(() => planTpl("119038201").items.some(i => i.label === "Хуучин харилцагчдаа мэндчилгээ илгээх" && i.group === "MY"));
    await p.waitForSelector('#overlay [data-act="del"][data-id="U1"]');
    /* L4-ийг Баасан гараг болговол Даваа (өнөөдөр) харагдахгүй */
    await p.selectOption('#overlay select[data-day="L4"]', "5");
    await p.waitForFunction(() => planTpl("119038201").items.find(i => i.id === "L4").weekly_day === 5);
    await p.waitForSelector('#overlay [data-act="del"][data-id="L2"]');
    await p.click('#overlay [data-act="del"][data-id="L2"]');
    await p.waitForFunction(() => !planTpl("119038201").items.some(i => i.id === "L2"));
    await p.click('#overlay .sheet-head [data-act="sheetClose"]');
    const txt = await p.textContent("#screen");
    assert(txt.includes("Миний нэмсэн") && txt.includes("Хуучин харилцагчдаа мэндчилгээ"), "нэмсэн ажил");
    assert(!txt.includes("Харилцагчдад 7 хоногийн мэдээлэл"), "Баасан гарагийн ажил нуугдсан");
    assert(txt.includes("Өөр гарагт хийх 1 ажил"), "нуугдсан ажлын сануулга");
    assert(!txt.includes("Бусад агентуудад мэдээлэл өгөх"), "хассан ажил");
  });

  await check(G, "Сүлжээний алдаа: +1 буцаагдаж, алдааны toast", browser, async p => {
    await as(p, ACTIVE, "#/plan", "#callsN");
    await p.evaluate(() => { S.demo.netError = true; });
    await p.click('[data-act="callPlus"]');
    await p.waitForSelector(".toast.err");
    eq(await p.textContent("#callsN"), "6", "буцсан");
    eq(await p.evaluate(() => planDay("119038201", TODAY).calls_done), 6);
  });

  await check(G, "Эрх: агент зөвхөн өөрийнхийг; дадлагажигч #/plan → хот; демо дахин эхлүүлэхэд анхны төлөв", browser, async p => {
    await p.evaluate(() => { S.session = "119038212"; });
    eq(await p.evaluate(async () => (await api.planToggle("NOPE")).ok), false, "байхгүй ажил");
    await p.evaluate(async () => { await api.planCall(1); });
    eq(await p.evaluate(() => planDay("119038201", TODAY).calls_done), 6, "бусдын тоолуурт нөлөөлөхгүй");
    eq(await p.evaluate(() => planDay("119038212", TODAY).calls_done), 1);
    await as(p, "119038213", "#/plan");
    await p.waitForFunction(() => location.hash === "#/onb");
    await p.evaluate(() => DEMO_ACT.reset());
    eq(await p.evaluate(() => planDay("119038212", TODAY).calls_done), 0, "reset");
  });
};
