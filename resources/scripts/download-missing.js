import { get } from 'axios';

import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'fs';

import { join } from 'path';

const apiURL = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';

const outputPath = join(__dirname, 'cards');

// Make sure the 'cards' folder exists
if (!existsSync(outputPath)) {
	mkdirSync(outputPath);
}

async function downloadImage(imageUrl, outputFilename) {
	try {
		const response = await get(imageUrl, { responseType: 'arraybuffer' });
		writeFileSync(outputFilename, Buffer.from(response.data), 'binary');
		console.log(`Downloaded image: ${outputFilename}`);
	} catch (error) {
		console.error(`Error downloading image: ${outputFilename} - ${error.message}`);
	}
}

async function getAllCardIds() {
	try {
		const response = await get(apiURL);

		return response.data.data.map((card) => card.id);
	} catch (error) {
		console.error(`Error fetching API data: ${error.message}`);
		return [];
	}
}

function getDownloadedCardIds() {
	return readdirSync(outputPath).map((filename) => parseInt(filename.split('.')[0]));
}

async function checkAndDownloadMissingImages() {
	const allCardIds = await getAllCardIds();
	const downloadedCardIds = getDownloadedCardIds();

	const missingCardIds = allCardIds.filter((id) => !downloadedCardIds.includes(id));

	console.log(`Total cards: ${allCardIds.length}`);
	console.log(`Downloaded cards: ${downloadedCardIds.length}`);
	console.log(`Missing cards: ${missingCardIds.length}`);

	for (const [index, id] of missingCardIds.entries()) {
		const cardInfo = await get(`${apiURL}?id=${id}`);
		const imageUrl = cardInfo.data.data[0].card_images[0].image_url;
		const outputFilename = join(outputPath, `${id}.jpg`);

		await downloadImage(imageUrl, outputFilename);
		console.log(
			`Downloaded missing image (${index + 1}/${missingCardIds.length}): ${outputFilename}`,
		);
	}

	console.log('All missing images have been downloaded.');
}

checkAndDownloadMissingImages();
