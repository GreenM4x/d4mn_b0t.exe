import fs from 'fs';
import { type Binder } from '../shared/models/binder.models.js';

type AllGlobalLeaderBoards = {
	[guildId: string]: {
		userId: string;
		points: number;
	}[];
};

function readDb(dbName: string = 'db.json'): Binder[] {
	try {
		// read JSON object from file
		const data = fs.readFileSync(dbName, 'utf8');
		return JSON.parse(data) as Binder[];
	} catch (error) {
		console.error('Error reading database:', error);
		return [];
	}
}

function getUserData(userId: string, dbName: string = 'db.json'): Binder {
	const data = readDb(dbName);

	const dateString = new Date().toLocaleDateString();
	const userData = data.find((item) => item.userId === userId);
	if (!userData) {
		const initialData: Binder = {
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

	if (!userData.dailyPurchases || userData.dailyPurchases.date !== dateString) {
		userData.dailyPurchases = {
			date: dateString,
			packs: {},
		};
	}

	return userData;
}

function writeDb(obj: Binder, dbName: string = 'db.json'): void {
	if (!obj) {
		console.log('Please provide data to save');
		return;
	}
	try {
		const data = readDb(dbName);
		const index = data.findIndex((item) => item.userId === obj.userId);
		if (index !== -1) {
			data[index] = obj;
		} else {
			data.push(obj);
		}
		fs.writeFileSync(dbName, JSON.stringify(data)); // overwrites current data
	} catch (err) {
		console.error('FAILED TO WRITE:', err);
	}
}

function getAllGlobalLeaderboard(
	dbName: string = './db/music/globalLeaderboard.json',
): AllGlobalLeaderBoards {
	try {
		if (!fs.existsSync(dbName)) {
			fs.writeFileSync(dbName, JSON.stringify({}));
		}
		const data = fs.readFileSync(dbName, 'utf8');
		const leaderboards = JSON.parse(data) as AllGlobalLeaderBoards;
		return leaderboards;
	} catch (error) {
		console.error('Error reading global leaderboard:', error);
		return {};
	}
}

function updateGlobalLeaderboard(
	newScores: Map<string, number>,
	guildId: string,
	dbName: string = './db/music/globalLeaderboard.json',
): void {
	try {
		const allLeaderboards = getAllGlobalLeaderboard(dbName);
		const leaderboard = allLeaderboards[guildId] || [];

		newScores.forEach((points, userId) => {
			const userEntry = leaderboard.find((entry) => entry.userId === userId);
			if (userEntry) {
				userEntry.points += points;
			} else {
				leaderboard.push({ userId, points });
			}
		});
		allLeaderboards[guildId] = leaderboard;
		fs.writeFileSync(dbName, JSON.stringify(allLeaderboards));
	} catch (error) {
		console.error('Error updating global leaderboard:', error);
	}
}

export { readDb, writeDb, getUserData, getAllGlobalLeaderboard, updateGlobalLeaderboard };
