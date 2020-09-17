const request = require("request-promise");
const cheerio = require("cheerio");
const login = require("facebook-chat-api");
const fs = require("fs");
const { userInfo } = require("os");

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
          const getCommand = event.body.split(" ");
          getCommand[0] === "/def"
            ? def(getCommand[1])
                .then((data) => {
                  api.sendMessage("😂 " + data, event.threadID);
                })
                .catch((err) =>
                  api.sendMessage("😗 no results", event.threadID)
                )
            : getCommand[0] === "/ex"
            ? getEx(getCommand[1])
                .then((data) => {
                  api.sendMessage("😂 " + data.join("😉"), event.threadID);
                })
                .catch((err) =>
                  api.sendMessage("😗 no results", event.threadID)
                )
            : glosble(getCommand[0])
                .then((data) => {
                  api.sendMessage("😗 " + data.join("😄"), event.threadID);
                })
                .catch((err) =>
                  api.sendMessage("😗 no results", event.threadID)
                );
          break;
        case "event":
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
  const url = `https://sentence.yourdictionary.com/${word}`;
  return new Promise((resolve, reject) => {
    if (vi) {
      resolve("😁 no result");
    } else {
      request(url)
        .then((data) => {
          let list = [];
          const $ = cheerio.load(data);
          for (let i = 0; i < 3; i++) {
            list.push($(".sentence.component").eq(i).text());
          }
          resolve(list);
        })
        .catch((err) => reject(err));
    }
  });
};
