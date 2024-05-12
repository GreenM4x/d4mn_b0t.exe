import { writeDb } from './dbFunctions.js';
import data from '../db.json';

const cardId = 777;
const CardArray = data[2].userCardId;

const newCardArray = [...CardArray, cardId];
console.log(newCardArray);

const dataObj = {
	userId: 4,
	userCardId: newCardArray,
};

writeDb(dataObj);
