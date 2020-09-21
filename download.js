const request = require("request");
const fs = require("fs");

const download = (url, dest, cb) => {
  let file = fs.createWriteStream(dest);
  /* Using Promises so that we can use the ASYNC AWAIT syntax */
  new Promise((resolve, reject) => {
    let stream = request({
      /* Here you should specify the exact link to the file you are trying to download */
      uri: url,
    })
      .pipe(file)
      .on("finish", () => {
        console.log(`The file is finished downloading.`);
        resolve();
      })
      .on("error", (error) => {
        reject(error);
      });
  })
    .catch((error) => {
      console.log(`Something happened: ${error}`);
    })
    .then((data) => cb());
};

module.exports = download;
