/* v5 хүртэлх үндсэн урсгал эвдрээгүй эсэх — товч smoke шалгалт */
const { as, assert, eq, check } = require("./harness");

module.exports = async function (browser) {
  const G = "Регресс (v5)";
  console.log("\n" + G);

  await check(G, "Нэвтрэх: «Идэвхтэй» агент PIN 111111 → Нүүр", browser, async p => {
    for (const n of "111111") await p.click('[data-act="key"][data-n="' + n + '"]');
    await p.waitForFunction(() => location.hash === "#/home");
    await p.waitForSelector("#nav button");
    eq(await p.locator('#nav [aria-current="page"]').textContent(), "Нүүр");
  });

  await check(G, "Буруу PIN → алдааны мөр", browser, async p => {
    for (const n of "123456") await p.click('[data-act="key"][data-n="' + n + '"]');
    await p.waitForSelector(".err-text");
    eq(await p.evaluate(() => location.hash), "#/login");
  });

  await check(G, "Дадлагажигч PIN-ээр нэвтэрвэл хот руу; доод цэс Хот · Даалгавар · Объект · Шагнал · Дүр", browser, async p => {
    await p.fill("#ph", "99136677");
    for (const n of "111111") await p.click('[data-act="key"][data-n="' + n + '"]');
    await p.waitForFunction(() => location.hash === "#/onb");
    await p.waitForSelector(".city .city-char");
    eq((await p.$$eval("#nav button span", s => s.map(x => x.textContent))).join(" · "), "Хот · Даалгавар · Объект · Шагнал · Дүр");
    /* Объект цэс → өөрийн объектын жагсаалт (эхний листинг), цэс дадлагажигчийнх хэвээр */
    await p.click('#nav [data-act="nav:#/objects"]');
    await p.waitForSelector(".item");
    eq(await p.evaluate(() => location.hash), "#/objects");
    eq(await p.locator(".item").count(), 1, "зөвхөн өөрийн 1 объект");
    assert((await p.textContent(".item")).includes("Сонгинохайрхан · 21-р хороо"), "дадлагажигчийн объект");
    eq(await p.getAttribute('#nav [data-act="nav:#/objects"]', "aria-current"), "page", "Объект идэвхтэй");
    eq(await p.locator("#nav button").count(), 5, "5 цэс");
  });

  await check(G, "Объект: жагсаалт ба 6-р алхмын цахим гарын үсгийн товч", browser, async p => {
    await as(p, "119038201", "#/objects", ".item");
    assert(await p.locator(".item").count() >= 6, "объектын жагсаалт");
    await as(p, "119038201", "#/obj/TMP-260920-05", ".track");
    assert((await p.textContent("#screen")).includes("Онлайнаар зуруулах"), "цахим гарын үсэг");
  });

  await check(G, "Эзэмшигчийн линк: код → гэрээ → зурах дэлгэц хүртэл", browser, async p => {
    await p.evaluate(() => { S.session = "119038201"; DEMO_ACT.esign("owner"); });
    await p.waitForSelector("#l4");
    await p.fill("#l4", "8834"); await p.click('[data-act="send"]');
    await p.waitForSelector(".sms-mock b");
    const code = (await p.textContent(".sms-mock b")).trim();
    await p.fill("#cd", code); await p.click('[data-act="verify"]');
    await p.waitForSelector("#agree");
    await p.check("#agree"); await p.click('[data-act="toDraw"]');
    await p.waitForSelector("canvas.sig-pad");
  });

  await check(G, "Удирдлага: менежерт нээгдэнэ, агентад хаалттай; «Онбординг» хэсэг харагдана", browser, async p => {
    await as(p, "119038201", "#/admin");
    await p.waitForFunction(() => location.hash === "#/home");
    await as(p, "119038207", "#/admin", ".funnel");
    await p.waitForSelector('[data-review="119038213|D3_ACCESS"]');
    assert((await p.textContent("#screen")).includes("Оффисын ээлж"), "оффисын ээлж хэвээр");
  });

  await check(G, "Оффисын ээлж: Admin Audit (8-р алхам) → 9-р алхам", browser, async p => {
    const r = await p.evaluate(async () => { S.session = "119038207"; return api.advance("TMP-260919-03", "OFFICE"); });
    eq(r.ok, true); eq(await p.evaluate(() => objById("TMP-260919-03").stage), 9);
    const bad = await p.evaluate(async () => api.advance("TMP-260918-02", "OFFICE"));
    eq(bad.ok, false, "агентын алхмыг оффис дуусгахгүй");
  });

  await check(G, "Ирц, Гүйлгээ, Би дэлгэцүүд ачаална", browser, async p => {
    for (const [h, txt] of [["#/attendance", "Ирц"], ["#/tx", "Гүйлгээ"], ["#/me", "Би"]]) {
      await as(p, "119038201", h, ".topbar h1");
      await p.waitForFunction(t => document.querySelector(".topbar h1").textContent === t && !document.querySelector(".sk"), txt);
    }
  });

  await check(G, "Нийтийн демо: noindex meta, «ДЕМО» тууз", browser, async p => {
    eq(await p.getAttribute('meta[name="robots"]', "content"), "noindex,nofollow");
    eq((await p.textContent(".demo-ribbon")).trim(), "ДЕМО — бүх өгөгдөл хиймэл");
  });

  await check(G, "Демо дахин эхлүүлэх: онбордингийн өгөгдөл анхны төлөвтөө", browser, async p => {
    await p.evaluate(() => { onbT("119038213").steps = {}; S.data.onb.ledger = []; DEMO_ACT.reset(); });
    eq(await p.evaluate(() => onbBalance("119038213")), 7);
    eq(await p.evaluate(() => onbBalance("119038214")), 3);
    eq(await p.evaluate(() => S.data.onb.requests.length), 0);
  });

  /* Туршилтын бэлтгэлийн засвар (2026.10.21): демогийн товч, toast халхлахгүй; дутуугийн тоо ижил */
  await check(G, "Демо товч доод цонхонд нуугдана; toast дээд талд, товшилт хаахгүй; дутуугийн тоо жагсаалт = дэлгэрэнгүй", browser, async p => {
    await as(p, "119038201", "#/objects", ".item");
    const li = (await p.locator(".item").filter({ hasText: "26-р хороолол" }).first().textContent()).match(/(\d+) талбар\/зураг дутуу/);
    assert(li, "жагсаалтад «N талбар/зураг дутуу»");
    await p.locator(".item").filter({ hasText: "26-р хороолол" }).first().click();
    await p.waitForSelector(".track");
    assert((await p.textContent("#screen")).includes(li[1] + " талбар/зураг дутуу"), "дэлгэрэнгүйд ижил тоо " + li[1]);
    assert(await p.isVisible("#demoFab"), "доод цонхгүй үед Демо товч харагдана");
    await as(p, "119038201", "#/obj/TMP-260920-05", ".track");
    await p.locator('button:has-text("Онлайнаар зуруулах")').first().click();
    await p.waitForSelector("#overlay .sheet");
    eq(await p.isVisible("#demoFab"), false, "доод цонх нээлттэй үед Демо товч");
    await p.evaluate(() => toast("Хадгалагдлаа"));
    const t = await p.evaluate(() => { const e = document.querySelector(".toast"), cs = getComputedStyle(e), r = e.getBoundingClientRect(); return { pe: cs.pointerEvents, top: r.top, h: innerHeight }; });
    eq(t.pe, "none", "toast pointer-events");
    assert(t.top < t.h / 3, "toast дээд талд");
  });

  /* T3 (2026.10.22): гүйлгээний жагсаалтад хотхон/байр гарчиг болж харагдана */
  await check(G, "Гүйлгээ: жагсаалтын гарчиг хотхон/байр, доор дүүрэг/хороо, TRR код", browser, async p => {
    await as(p, "119038201", "#/tx", ".item");
    const it = p.locator(".item").filter({ hasText: "TRR-26-000407" }).first();
    eq((await it.locator(".item-title").textContent()).trim(), "26-р хороолол, 12-р байр", "гарчиг");
    assert((await it.textContent()).includes("Баянзүрх, 14-р хороо · Худалдаа"), "дүүрэг/хороо");
  });
};
