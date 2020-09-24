const request = require("request-promise");
const { detectVi } = require("./detectVi");

exports.translateMicrosoft = async (sen) => {
  const vi = detectVi(sen);
  const lang = vi ? "from=vi&to=en" : "from=en&to=vi";
  const url = `http://api.microsofttranslator.com/V2/Ajax.svc/Translate?appId=ABB1C5A823DC3B7B1D5F4BDB886ED308B50D1919&${lang}&text=${sen}`;
  const finalUrl = encodeURI(url);
  return new Promise((resolve, reject) => {
    request(finalUrl).then((data) => {
      if (data) {
        resolve(data.replace(/"/g, ""));
      } else {
        reject("😃 no result");
      }
    });
  }).catch((err) => reject(err));
};

exports.translateViki = (sen) => {
  const vi = detectVi(sen);
  const lang = vi ? "src=vi&tgt=en" : "src=en&tgt=vi";
  const url = "https://vikitranslator.com/divaba";
  const options = {
    method: "POST",
    uri: url,
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: `key=testkey&${lang}&vb=${sen}`,
  };
  return new Promise((resolve, reject) => {
    request(options).then((data) => {
      if (data) {
        resolve(data);
      } else {
        reject("😀 no result");
      }
    });
  }).catch((err) => reject(err));
};
