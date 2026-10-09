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

  await check(G, "Дадлагажигч PIN-ээр нэвтэрвэл хот руу; доод цэс Хот · Даалгавар · Шагнал · Дүр", browser, async p => {
    await p.fill("#ph", "99136677");
    for (const n of "111111") await p.click('[data-act="key"][data-n="' + n + '"]');
    await p.waitForFunction(() => location.hash === "#/onb");
    await p.waitForSelector(".city .city-char");
    eq((await p.$$eval("#nav button span", s => s.map(x => x.textContent))).join(" · "), "Хот · Даалгавар · Шагнал · Дүр");
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
};
