/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
type LeaderBoardItem = [string, number];

export function getRandom<T>(arr: T[], n: number): T[] {
	if (n > arr.length) throw new RangeError('getRandom: more elements taken than available!');
	const result = new Array<T>(n);
	let len = arr.length;
	const taken = new Array(len);
	while (n--) {
		const x = Math.floor(Math.random() * len);
		result[n] = arr[x in taken ? taken[x] : x] as T;
		taken[x] = --len in taken ? taken[len] : len;
	}
	return result;
}

export const normalizeValue = (value: string): string =>
	value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // remove diacritics
		.replace(/[^0-9a-zA-Z\s]/g, '') // remove non-alphanumeric characters
		.trim()
		.replace(/\s+/g, ' ')
		.toLowerCase(); // remove duplicate spaces

export const capitalizeWords = (str: string): string =>
	str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());

export const getLeaderBoard = (arr: LeaderBoardItem[]) => {
	if (!arr || !arr.length) return null;
	arr.sort((a, b) => b[1] - a[1]);

	let leaderBoard = '__**LEADERBOARD**__ \n\n';
	const emojis = ['🥇', '🥈', '🥉'];
	arr.forEach((item, index) => {
		leaderBoard += `${emojis[index] || ''} - <@${item[0]}> - ${item[1]} points\n\n`;
	});

	return leaderBoard.trim();
};
