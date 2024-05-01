const fs = require("fs");

function readDb(dbName = "db.json") {
  // read JSON object from file
  const data = fs.readFileSync(dbName, "utf8");
  return JSON.parse(data);
}

function getUserData(userId, dbName = "db.json") {
  const data = readDb(dbName);

  const dateString = new Date().toLocaleDateString();
  const userData = data.find((item) => item.userId == userId);
  if (!userData) {
    const initialData = {
      userId: userId,
      currency: 0,
      dailyPurchases: {
        date: dateString,
        packs: {},
      },
      cards: [],
      stats: { cardsAddedToBinder: 0, cardsDiscarded: 0, cardsGifted: 0, cardsSold: 0 },
    };
    return initialData;
  }

  if (!userData?.dailyPurchases || userData?.dailyPurchases.date !== dateString) {
    userData["dailyPurchases"] = {
      date: dateString,
      packs: {},
    };
  }

  return userData;
}

function writeDb(obj, dbName = "db.json") {
  if (!obj) return console.log("Please provide data to save");
  try {
    var data = require("../db.json");
    if (data.some((item) => item.userId === obj.userId)) {
      data[data.findIndex((x) => x.userId === obj.userId)] = obj;
    } else {
      data.push(obj);
    }
    fs.writeFileSync(dbName, JSON.stringify(data)); //overwrites current data
    return;
  } catch (err) {
    return console.log("FAILED TO WRITE");
  }
}

module.exports = { readDb, writeDb, getUserData };
