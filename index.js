const request = require("request-promise");
const cheerio = require("cheerio");
const login = require("facebook-chat-api");
const fs = require("fs");
const puppeteer = require("puppeteer");
const https = require("https");
const download = require("./download");
const helps = require("./help");
const { detectVi } = require("./detectVi");
const { translateMicrosoft, translateViki } = require("./tranlate");

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
            case "/dif":
                dif(word[0], word[1]).then(data => api.sendMessage("😗 " + data, event.threadID)).catch((err) =>
                api.sendMessage("💩 no results", event.threadID)
              );
            break;
            case "/voca":
              if (!word.length) {
                fs.readFile("./voca.txt", "utf8", (err, data) => {
                  api.sendMessage("😗 " + data, event.threadID);
                });
              }
              fs.appendFileSync("./voca.txt", '\n' + word.join('\n'));
              break;
            case "/vocaf":
              fs.writeFileSync("./voca.txt", "");
              break;
            case "/review":
                fs.readFile('./voca.txt', 'utf8', (err,data) => {
                    const newData = data.trim().split('\n')
                    var missWords = []
                    const total = newData.reduce((acc, val) => {
                        if (word.includes(val)) {
                            acc = acc + 1
                        } else {
                            missWords.push(val)
                        }
                        return acc
                    }, 0)
                    api.sendMessage(`💩 You passed ${total}/${newData.length} - missed Words: ${missWords}`, event.threadID)
                    missWords.length = 0
                })
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
              api.sendMessage(helps.join("\n"), event.threadID);
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
            case "/tr":
              translate(word.join(" ")).then((data) => {
                api.sendMessage(`😉 ${data.join("\n😉 ")}`, event.threadID);
              });
              break;
            case "/rd":
              rdSentences(...word)
                .then((data) => {
                  if (data.length) {
                    api.sendMessage(`😁 ${data.join("\n")}`, event.threadID);
                  } else {
                    api.sendMessage(`💩 no results`, event.threadID);
                  }
                })
                .catch((err) =>
                  api.sendMessage("💩 no results", event.threadID)
                );
              break;
            case "/blacklist":
              addToBackList(word.join(" "));
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

const addToBackList = (word) => {
  console.log("word", word);
  blacklist = [...blacklist, word];
};

const translate = async (sen) => {
  const data = await Promise.all([translateMicrosoft(sen), translateViki(sen)]);
  return data;
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
      const link = rs[1].replace(/\\/g, "");
      console.log(link);
      download(link, __dirname + `/girls/${name}.jpg`, function () {
        console.log();
        cb(name);
      });
    } else {
      cb(false);
    }
  });
};

const rdSentences = (quantity = 4, count = 10, contain = "") => {
  const url = `https://www.randomwordgenerator.org/Random/sentence_generator/quantity/${
    isNaN(quantity) ? 4 : quantity
  }/count/${count}/contain/${contain}`;
  return new Promise((resolve, reject) => {
    request(url)
      .then((data) => {
        const $ = cheerio.load(data);
        const list = [];
        $(".res-sentence").each(function (idx, val) {
          list.push($(this).text());
        });
        resolve(list);
      })
      .catch((err) => reject(err));
  });
};

const dif = (firstWord, secondWord) => {
    const url = `https://wikidiff.com/${firstWord}/${secondWord}`
    return new Promise((resolve, reject) => {
        request(url).then(data => {
            const $ = cheerio.load(data);
            resolve($(".differencebetween").text())
        })        
    }).catch(err => reject(err))
}

start();
