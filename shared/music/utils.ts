import leven from 'leven';

type LeaderBoardItem = [string, number];

function levenshteinDistance(a: string, b: string): number {
	return leven(a, b);
}

export function similarity(a: string, b: string): number {
	const distance = levenshteinDistance(a, b);
	const maxLength = Math.max(a.length, b.length);
	return (maxLength - distance) / maxLength;
}

export function getRandom<T>(arr: T[], n: number): T[] {
	if (n > arr.length) throw new RangeError('getRandom: more elements taken than available!');
	return arr
		.map((value) => ({ value, sort: Math.random() })) // add random sort value
		.sort((a, b) => a.sort - b.sort) // sort by random value
		.slice(0, n) // take n values
		.map((pair) => pair.value); // only keep the value
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
