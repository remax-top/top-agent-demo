/* Бүх шалгалт:  NODE_PATH=$(npm root -g) node tests/run.js */
const { chromium, results } = require("./harness");

(async () => {
  const browser = await chromium.launch();
  try {
    await require("./regression.test.js")(browser);
    await require("./onboarding.test.js")(browser);
  } finally {
    await browser.close();
  }
  const fail = results.filter(r => !r.ok);
  console.log("\n" + (results.length - fail.length) + " / " + results.length + " шалгалт тэнцлээ");
  process.exit(fail.length ? 1 : 0);
})();
