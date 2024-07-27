import { EmbedBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder } from 'discord.js';
import { getCardData } from './card.js';

const createEmbed = ({
	title,
	fields,
	color,
	imageUrl,
	thumbnailUrl,
	timestamp,
	url,
	description,
	footer,
}) => {
	const embed = new EmbedBuilder().setTitle(title).setColor(color).setURL(url);

	if (thumbnailUrl) {
		embed.setThumbnail(thumbnailUrl);
	}

	if (imageUrl) {
		embed.setImage(imageUrl);
	}

	if (fields) {
		embed.addFields(fields);
	}

	if (timestamp) {
		embed.setTimestamp(timestamp);
	}

	if (description) {
		embed.setDescription(description);
	}

	if (footer) {
		embed.setFooter(footer);
	}

	return embed;
};

const createFilterMenu = (cardData, activeFilters = []) => {
	const typeOptions = Array.from(new Set(cardData.map((card) => card.type))).sort();
	const rarityOptions = Array.from(new Set(cardData.map((card) => card.rarity))).sort();

	const options = [
		...typeOptions.map((option) =>
			new StringSelectMenuOptionBuilder()
				.setLabel(option)
				.setValue(`type_${option}`)
				.setDefault(activeFilters.includes(`type_${option}`)),
		),
		...rarityOptions.map((option) =>
			new StringSelectMenuOptionBuilder()
				.setLabel(option)
				.setValue(`rarity_${option}`)
				.setDefault(activeFilters.includes(`rarity_${option}`)),
		),
	];

	return new StringSelectMenuBuilder()
		.setCustomId('type_rarity_filter_select_id_binder')
		.setPlaceholder('Filter by Type or Rarity')
		.addOptions(options)
		.setMinValues(0)
		.setMaxValues(options.length);
};

const filterCards = (cards, filters) => {
	if (!filters || !filters.length) return cards;

	const typeFilters = filters
		.filter((filter) => filter.startsWith('type_'))
		.map((filter) => filter.replace('type_', ''));
	const rarityFilters = filters
		.filter((filter) => filter.startsWith('rarity_'))
		.map((filter) => filter.replace('rarity_', ''));

	return cards.filter((card) => {
		const typeMatch = typeFilters.length === 0 || typeFilters.includes(card.type);
		const rarityMatch = rarityFilters.length === 0 || rarityFilters.includes(card.rarity);
		return typeMatch && rarityMatch;
	});
};

function createSortMenu(activeSort) {
	const sortMenu = new StringSelectMenuBuilder()
		.setCustomId('sort_select_id_binder')
		.setPlaceholder('Sort by')
		.addOptions([
			{
				label: 'Sort by: Rarity',
				value: 'sort_rarity',
				default: activeSort === 'sort_rarity',
			},
			{
				label: 'Sort by: Price',
				value: 'sort_price',
				default: activeSort === 'sort_price',
			},
			{
				label: 'Sort by: Type',
				value: 'sort_type',
				default: activeSort === 'sort_type',
			},
		]);

	return sortMenu;
}

const sortCards = (cards, sortBy) => {
	if (!sortBy) return cards;

	const sortedCards = [...cards];

	switch (sortBy) {
		case 'sort_rarity':
			sortedCards.sort((a, b) => a.rarity.localeCompare(b.rarity));
			break;
		case 'sort_price':
			sortedCards.sort((a, b) => b.price - a.price);
			break;
		case 'sort_type':
			sortedCards.sort((a, b) => a.type.localeCompare(b.type));
			break;
		default:
			break;
	}

	return sortedCards;
};

const calculateBinderValue = (cards) => {
	return cards.reduce((totalValue, card) => {
		const { price } = getCardData(card);
		return totalValue + parseFloat(price);
	}, 0);
};

// Fisher-Yates shuffle algorithm (https://javascript.info/task/shuffle)
const shuffle = (array) => {
	for (let i = array.length - 1; i > 0; i--) {
		let j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
};

export {
	createEmbed,
	createFilterMenu,
	filterCards,
	calculateBinderValue,
	shuffle,
	createSortMenu,
	sortCards,
};
