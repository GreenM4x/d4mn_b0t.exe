import fs from 'fs';

function readDb(dbName = 'db.json') {
	// read JSON object from file
	const data = fs.readFileSync(dbName, 'utf8');
	return JSON.parse(data);
}

function getUserData(userId, dbName = 'db.json') {
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
		userData['dailyPurchases'] = {
			date: dateString,
			packs: {},
		};
	}

	return userData;
}

function writeDb(obj, dbName = 'db.json') {
	if (!obj) return console.log('Please provide data to save');
	try {
		const data = JSON.parse(fs.readFileSync(dbName, 'utf8'));
		const index = data.findIndex((item) => item.userId === obj.userId);
		if (index !== -1) {
			data[index] = obj;
		} else {
			data.push(obj);
		}
		fs.writeFileSync(dbName, JSON.stringify(data)); // overwrites current data
		return;
	} catch (err) {
		return console.log('FAILED TO WRITE');
	}
}

export { getUserData, readDb, writeDb };
