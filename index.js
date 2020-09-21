const request = require("request-promise");
const cheerio = require("cheerio");
const login = require("facebook-chat-api");
const fs = require("fs");
const puppeteer = require("puppeteer");
const https = require("https");
const dl = require("download-file");

const detectVi = (str) => {
  const AccentsMap = [
    "aàảãáạăằẳẵắặâầẩẫấậ",
    "AÀẢÃÁẠĂẰẲẴẮẶÂẦẨẪẤẬ",
    "dđ",
    "DĐ",
    "eèẻẽéẹêềểễếệ",
    "EÈẺẼÉẸÊỀỂỄẾỆ",
    "iìỉĩíị",
    "IÌỈĨÍỊ",
    "oòỏõóọôồổỗốộơờởỡớợ",
    "OÒỎÕÓỌÔỒỔỖỐỘƠỜỞỠỚỢ",
    "uùủũúụưừửữứự",
    "UÙỦŨÚỤƯỪỬỮỨỰ",
    "yỳỷỹýỵ",
    "YỲỶỸÝỴ",
  ];
  for (let i = 0; i < AccentsMap.length; i++) {
    let re = new RegExp("[" + AccentsMap[i].substr(1) + "]", "g");
    if (re.test(str)) {
      return true;
    }
  }
  return false;
};

const download = function (url, dest, cb) {
  var file = fs.createWriteStream(dest);
  try {
    var request = https
      .get(url, function (response) {
        response.pipe(file);
        file.on("finish", function () {
          file.close(cb);
        });
      })
      .on("error", function (error) {
        console.log("a", error.message);
      });
  } catch (e) {
    console.log("b", e);
  }
};

const pp = puppeteer.launch({ args: ["--no-sandbox"] });

const start = () => {
  login(
    { appState: JSON.parse(fs.readFileSync("appstate.json", "utf8")) },
    (err, api) => {
      if (err) return console.error(err);
      api.setOptions({ listenEvents: true, selfListen: true });
      const stopListening = api.listenMqtt((err, event) => {
        if (err) return console.error(err);
        if (event.type === "message") {
          const commands = event.body.trim().split(" ");
          const [cmd, ...word] = commands;
          switch (cmd) {
            case "/en":
              glosble(word.join(" "), "en")
                .then((data) => {
                  api.sendMessage("😗 " + data.join("\n💩"), event.threadID);
                })
                .catch((err) =>
                  api.sendMessage("💩 no results", event.threadID)
                );
              break;
            case "/vi":
              glosble(word.join(" "), "vi")
                .then((data) => {
                  api.sendMessage("😗 " + data.join("\n💩"), event.threadID);
                })
                .catch((err) =>
                  api.sendMessage("💩 no results", event.threadID)
                );
              break;
            case "/ex":
              getEx(word.join(" "))
                .then((data) => {
                  api.sendMessage("😗 " + data.join("\n😀"), event.threadID);
                })
                .catch((err) =>
                  api.sendMessage("💩 no results", event.threadID)
                );
              break;
            case "/help":
              const helps = [
                `💀 /ex [word] : -> in ví dụ cho word`,
                `💀 /en [word] : -> dịch word sang English`,
                `💀 /vi [word] : -> dịch word sang Vietnames`,
              ];
              break;
            case "/so":
              getSound(word.join(" "), function (data) {
                if (data) {
                  const msg = {
                    body: `😂 ${data}`,
                    attachment: fs.createReadStream(
                      `${__dirname}/sounds/${data}.mp3`
                    ),
                  };
                  api.sendMessage(msg, event.threadID);
                } else {
                  api.sendMessage("Not found!", event.threadID);
                }
              });
              break;
            case "/girl":
              const name = new Date().getTime();
              getGirl(name, function (a) {
                const msg = {
                  attachment: fs.createReadStream(
                    `${__dirname}/girls/${a}.jpg`
                  ),
                };
                api.sendMessage(msg, event.threadID);
              });
              break;
          }
        }
      });
    }
  );
};

const getSound = (word, cb) => {
  const vi = detectVi(word);
  const url = `https://dict.laban.vn/ajax/getsound?accent=us&word=${word}`;

  if (vi) {
    resolve("😀 i cannot speak vietnames");
  } else {
    pp.then(async (browser) => {
      const page = await browser.newPage();
      const response = await page.goto(url);
      const source = await response.text();
      const rs = source.match(/\"data\"\:\"(.*?)\"/);
      if (rs[1]) {
        download(rs[1], __dirname + `/sounds/${word}.mp3`, function () {
          cb(word);
        });
      } else {
        cb(false);
      }
      page.close();
    });
  }
};

const glosble = (word, lang) => {
  // const vi = detectVi(word);

  const url = `https://glosbe.com/${lang === "en" ? "vi/en" : "en/vi"}/${word}`;

  const finalUrl = encodeURI(url);

  return new Promise((resolve, reject) => {
    request(finalUrl)
      .then((data) => {
        const $ = cheerio.load(data);
        let list = [];
        list.push($(".defmetas").text());
        $(".phr").each(function (i, elm) {
          list.push($(this).text());
        });
        resolve(list);
      })
      .catch((err) => reject(err));
  });
};

const def = (word) => {
  const vi = detectVi(word);
  const url = `https://www.yourdictionary.com/${word}`;
  return new Promise((resolve, reject) => {
    if (vi) {
      resolve("no result");
    } else {
      request(url)
        .then((data) => {
          const $ = cheerio.load(data);
          resolve($(".custom_entry").text());
        })
        .catch((err) => reject(err));
    }
  });
};

const getEx = (word) => {
  const vi = detectVi(word);
  const url = `https://dict.laban.vn/find?query=${word}`;
  return new Promise((resolve, reject) => {
    if (vi) {
      resolve("😁 no result");
    } else {
      pp.then(async (browser) => {
        const page = await browser.newPage();
        const response = await page.goto(url);
        const $ = cheerio.load(await response.text());
        let list = [];
        for (let i = 0; i < 5; i++) {
          list.push(
            $("#content_selectable .color-light-blue.margin25.m-top15")
              .eq(i)
              .text()
          );
        }

        resolve(list);
        page.close();
      });
    }
  });
};

const getGirl = (name, cb) => {
  const url = "https://gxcl.info/api.php";
  request(url).then((data) => {
    const rs = data.match(/\"link\"\:\"(.*?)\"/);
    if (rs[1]) {
      download(rs[1], __dirname + `/girls/${name}.jpg`, function () {
        console.log();
        cb(name);
      });
      // var options = {
      //   directory: `${__dirname}/girls/`,
      //   filename: `${name}.jpg`,
      // };
      // console.log(__dirname);
      // dl(rs[1], options, function (err) {
      //   if (err) throw err;
      //   cb(name);
      // });
    } else {
      cb(false);
    }
  });
};

start();
// getSound("hello");
// glosble("code");
