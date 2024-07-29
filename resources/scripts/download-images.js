import { get } from 'axios';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
const apiURL = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';
const outputPath = join(__dirname, 'cards');

if (!existsSync(outputPath)) {
	mkdirSync(outputPath);
}

async function downloadImage(imageUrl, outputFilename) {
	try {
		const response = await get(imageUrl, { responseType: 'arraybuffer' });
		writeFileSync(outputFilename, Buffer.from(response.data), 'binary');
	} catch (error) {
		console.error(`Error downloading image: ${outputFilename} - ${error.message}`);
	}
}

async function downloadAllImages() {
	try {
		const response = await get(apiURL);
		const cards = response.data.data;
		// remove the first 2000 elements
		cards.splice(0, 9978);

		for (const [index, card] of cards.entries()) {
			const imageUrl = card.card_images[0].image_url;
			const outputFilename = join(outputPath, `${card.id}.jpg`);

			await downloadImage(imageUrl, outputFilename);
			console.log(`Progress: ${index + 1}/${cards.length}`);
			await delay(50);
		}

		console.log('All images have been downloaded.');
	} catch (error) {
		// @ts-expect-error TS(2571) FIXME: Object is of type 'unknown'.
		console.error(`Error fetching API data: ${error.message}`);
	}
}

downloadAllImages();

// @ts-expect-error TS(2393) FIXME: Duplicate function implementation.
function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
