import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import axios from 'axios';
import { GoogleSearchResponse } from '../shared/models/google-api.models.js';

const data = new SlashCommandBuilder().setName('tenz').setDescription('Sexiest man alive');

const API_KEY = process.env.SEARCH_API_KEY;
const SEARCH_ENGINE_ID = process.env.SEARCH_ENGINE_ID;

async function getRandomTenZImage(): Promise<string | undefined> {
	try {
		const queries = [
			'TenZ Valorant',
			'TenZ player',
			'Tyson Ngo',
			'TenZ esports',
			'TenZ photoshoot',
		];

		const randomQuery = queries[Math.floor(Math.random() * queries.length)];
		const randomStart = Math.floor(Math.random() * 10) + 1;

		const response = await axios.get<GoogleSearchResponse>(
			'https://www.googleapis.com/customsearch/v1',
			{
				params: {
					key: API_KEY,
					cx: SEARCH_ENGINE_ID,
					q: randomQuery,
					searchType: 'image',
					num: 10,
					start: randomStart,
				},
			},
		);

		const items = response.data.items;
		if (items && items.length > 0) {
			const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
			const filteredItems = items.filter((item) => {
				const link = item.link.toLowerCase();
				return supportedExtensions.some((ext) => link.endsWith(ext));
			});

			if (filteredItems.length > 0) {
				const randomIndex = Math.floor(Math.random() * filteredItems.length);
				return filteredItems[randomIndex]!.link;
			}
		}
		return undefined;
	} catch (error) {
		console.error('Error fetching TenZ images:', error);
		return undefined;
	}
}

async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	await interaction.deferReply();

	const randomImage = await getRandomTenZImage();

	if (randomImage) {
		await interaction.editReply({ content: randomImage });
	} else {
		await interaction.editReply({
			content: "Sorry, I couldn't find any TenZ images at the moment. What a sad day.",
		});
	}
}

export { data, execute };
