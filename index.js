const request = require("request-promise");
const cheerio = require("cheerio");
const login = require("facebook-chat-api");
const fs = require("fs");
const readline = require("readline");

login(
  { appState: JSON.parse(fs.readFileSync("appstate.json", "utf8")) },
  (err, api) => {
    api.setOptions({
      selfListen: true,
      logLevel: "silent",
      updatePresence: false,
    });
    if (err) return console.error(err);
    // Here you can use the api
    api.listen((err, message) => {
      if (err) return console.error(err);
      let msg = message.body;
      if (message.isGroup) {
        if (typeof msg === "string") {
          console.log(msg);
        }
      }
    });
  }
);

const glosble = async (word) => {
  const url = "https://glosbe.com/en/vi/dadsadas";

  const rs = await request(url).catch((err) =>
    console.log("can not find this world")
  );
  //   console.log(rs);
  //   const $ = cheerio.load(rs);
  //   $(".phr").each(function (i, elm) {
  //     console.log($(this).text()); // for testing do text()
  //   });
};
