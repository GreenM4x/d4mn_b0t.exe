function getRandom(arr, n) {
  if (n > arr.length)
      throw new RangeError('getRandom: more elements taken than available!');
  const result = new Array(n);
  let len = arr.length;
  const taken = new Array(len);
  while (n--) {
      const x = Math.floor(Math.random() * len);
      result[n] = arr[(x in taken) ? taken[x] : x];
      taken[x] = (--len in taken) ? taken[len] : len;
  }
  return result;
}

const normalizeValue = value =>
  value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '') // remove diacritics
  .replace(/[^0-9a-zA-Z\s]/g, '') // remove non-alphanumeric characters
  .trim()
  .replace(/\s+/g, ' ')
  .toLowerCase(); // remove duplicate spaces

const capitalizeWords = str =>
  str.replace(/\w\S*/g, txt =>
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

const getLeaderBoard = arr => {
  if (!arr || !arr.length) return; 
  arr.sort((a, b) => b[1] - a[1]);

  let leaderBoard = '__**LEADERBOARD**__ \n\n';
  const emojis = ['🥇', '🥈', '🥉'];
  arr.forEach((item, index) => {
      leaderBoard += `${emojis[index] || ''} - <@${item[0]}> - ${item[1]} points\n\n`;
  });

  return leaderBoard.trim();
};

module.exports = {
  getRandom,
  normalizeValue,
  capitalizeWords,
  getLeaderBoard
};
