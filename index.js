const request = require("request-promise");
const cheerio = require("cheerio");
const login = require("facebook-chat-api");
const fs = require("fs");

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
  for (var i = 0; i < AccentsMap.length; i++) {
    var re = new RegExp("[" + AccentsMap[i].substr(1) + "]", "g");
    if (re.test(str)) {
      return true;
    }
  }
  return false;
};
login(
  { appState: JSON.parse(fs.readFileSync("appstate.json", "utf8")) },
  (err, api) => {
    if (err) return console.error(err);

    api.setOptions({ listenEvents: true, selfListen: true });

    var stopListening = api.listenMqtt((err, event) => {
      if (err) return console.error(err);

      switch (event.type) {
        case "message":
          // if (event.body === "/stop") {
          //   api.sendMessage("Goodbye...", event.threadID);
          //   return stopListening();
          // }
          if (event.body.startsWith("/")) {
            let word = event.body.slice(1);
            glosble(word)
              .then((data) => {
                api.sendMessage("Results: " + data.join("😄"), event.threadID);
              })
              .catch((err) => api.sendMessage("no results", event.threadID));
          }
          // console.log(event.threadID);

          break;
        case "event":
          console.log(event);
          break;
      }
    });
  }
);

const glosble = (word) => {
  const vi = detectVi(word);
  const url = `https://glosbe.com/${vi ? "vi" : "en"}/${
    vi ? "en" : "vi"
  }/${word}`;

  const finalUrl = encodeURI(url);

  return new Promise((resolve, reject) => {
    request(finalUrl)
      .then((data) => {
        const $ = cheerio.load(data);
        let list = [];
        $(".phr").each(function (i, elm) {
          list.push($(this).text());
        });
        resolve(list);
      })
      .catch((err) => reject(err));
  });
};
