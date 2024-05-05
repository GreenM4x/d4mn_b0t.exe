const { writeDb } = require('./dbFunctions');

var cardId = 777;
var data = require('../db.json');

const CardArry = data[2].userCardId;

var newCardArry = CardArry.slice();
newCardArry.push(cardId);
console.log(newCardArry);
const dataObj = {
	userId: 4,
	userCardId: newCardArry,
};

writeDb(dataObj);
