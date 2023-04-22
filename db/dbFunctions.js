const fs = require("fs");

function readDb(dbName = "db.json") {
  // read JSON object from file
  const data = fs.readFileSync(dbName, "utf8");
  return JSON.parse(data);
}

function getUserData(userId, dbName = "db.json") {
  const data = readDb(dbName);
  return data.find((item) => item.userId == userId);
}

function writeDb(obj, dbName = "db.json") {
  if (!obj) return console.log("Please provide data to save");
  try {
    var data = require("../db.json");
    if (data.some((item) => item.userId == obj.userId)) {
      data[data.findIndex((x) => x.userId === obj.userId)] = obj;
    } else {
      data.push(obj);
    }
    fs.writeFileSync(dbName, JSON.stringify(data)); //overwrites current data
    return console.log("SAVE SUCESS");
  } catch (err) {
    return console.log("FAILED TO WRITE");
  }
}

module.exports = { readDb, writeDb, getUserData };
