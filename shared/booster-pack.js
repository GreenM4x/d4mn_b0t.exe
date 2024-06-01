import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

import { writeDb } from '../db/dbFunctions.js';
import { getCardData, getColorForCardType } from './card.js';
import { createEmbed, shuffle } from './utils.js';
import { RARITIES } from './variables.js';

const openBoosterPack = async (interaction, binder, pack) => {
	const cards = createBoosterPack(pack.cards);
	let currentCardIndex = 0;
	let cardData = getCardData(cards[currentCardIndex], pack.id);
	let cardsAdded = 0;
	let cardsSold = 0;
	const totalBoosterValue = cards
		.reduce((acc, card) => acc + parseFloat(getCardData(card).price), 0)
		.toFixed(2);

	const displayCardEmbed = () => {
		const embed = createEmbed({
			title: cardData.name,
			fields: [
				{
					name: 'Cards pulled',
					value: `${currentCardIndex + 1}/${cards.length}`,
					inline: false,
				},
				{ name: 'Price', value: `${cardData.price}€`, inline: true },
				{ name: 'Rarity', value: cardData.rarity, inline: true },
			],
			color: getColorForCardType(cardData.type),
			imageUrl: cardData.img,
		});
		return embed;
	};

	const displaySummaryEmbed = () => {
		const embed = createEmbed({
			title: `${pack.name} summary`,
			color: 0x00ff00,
			fields: [
				{
					name: 'Total booster value',
					value: totalBoosterValue + '€',
					inline: false,
				},
				{ name: 'Cards added to binder', value: cardsAdded.toString(), inline: false },
				{ name: 'Cards sold', value: cardsSold.toString(), inline: false },
			],
		});
		return embed;
	};

	const addToBinderButton = new ButtonBuilder()
		.setCustomId('add_to_binder_id_booster')
		.setLabel('Place in Binder')
		.setStyle(ButtonStyle.Primary)
		.setEmoji('❤️');

	const sellButton = new ButtonBuilder()
		.setCustomId('sell_id_booster')
		.setLabel('Sell It')
		.setStyle(ButtonStyle.Success)
		.setEmoji('🤑');

	const actionRow = new ActionRowBuilder().addComponents(addToBinderButton, sellButton);

	const boosterMessage = await interaction.followUp({
		content: `Opening ${pack.name}...`,
		embeds: [displayCardEmbed()],
		components: [actionRow],
		files: [
			new AttachmentBuilder(`./db/images/${cardData.id}.jpg`, {
				name: `${cardData.id}.jpg`,
			}),
		],
	});

	const filter = (i) =>
		i.isButton() &&
		i.user.id === interaction.user.id &&
		(i.customId === 'add_to_binder_id_booster' || i.customId === 'sell_id_booster');
	const collector = interaction.channel.createMessageComponentCollector({
		filter,
		time: 1800000,
	});

	collector.on('collect', async (i) => {
		let message = '';
		if (i.customId === 'add_to_binder_id_booster') {
			binder.cards.push({ id: cardData.id, rarity: cardData.rarity });
			binder.stats.cardsAddedToBinder++;
			cardsAdded++;
			message = 'The previous card was added to binder';
		} else if (i.customId === 'sell_id_booster') {
			binder.currency += parseFloat(cardData.price);
			cardsSold++;
			binder.stats.cardsSold++;
			message = `The previous card was sold for ${cardData.price}€`;
		}

		writeDb(binder);
		currentCardIndex++;
		if (currentCardIndex < cards.length) {
			cardData = getCardData(cards[currentCardIndex]);
			const updatedEmbed = displayCardEmbed().setFooter({ text: message });
			await interaction.channel.messages.edit(boosterMessage.id, {
				embeds: [updatedEmbed],
				components: [actionRow],
				files: [
					new AttachmentBuilder(`./db/images/${cardData.id}.jpg`, {
						name: `${cardData.id}.jpg`,
					}),
				],
			});
		} else {
			await interaction.channel.messages.edit(boosterMessage.id, {
				content: 'All cards have been drawn!',
				embeds: [displaySummaryEmbed()],
				components: [],
				files: [],
			});
			collector.stop();
		}
		i.deferUpdate();
	});
};

const createBoosterPack = (cards) => {
	const rarityProbabilities = RARITIES;
	const allUniqueRarities = cards.reduce((acc, card) => {
		if (!acc.includes(card.rarity)) {
			acc.push(card.rarity);
		}
		return acc;
	}, []);

	const filteredRarityProbabilities = Object.fromEntries(
		Object.entries(rarityProbabilities).filter(([key]) => allUniqueRarities.includes(key)),
	);

	const boosterPack = [];
	const remainingCards = [...cards];

	// Add 7 commons, if there are no commons or too less, add rare cards instead. If there are no rare cards, add other rarities.
	for (let i = 0; i < 7; i++) {
		const card =
			getRandomCardByRarity(remainingCards, 'Common') ||
			getRandomCardByRarity(remainingCards, 'Rare') ||
			getRandomCardByProbabilities(remainingCards, filteredRarityProbabilities);
		if (card) {
			boosterPack.push(card);
			remainingCards.splice(remainingCards.indexOf(card), 1);
		}
	}

	// Add 1 rare card, if there are no rare cards, add other rarities.
	const rareCard =
		getRandomCardByRarity(remainingCards, 'Rare') ||
		getRandomCardByProbabilities(remainingCards, filteredRarityProbabilities);
	if (rareCard) {
		boosterPack.push(rareCard);
		remainingCards.splice(remainingCards.indexOf(rareCard), 1);
	}

	// Add 1 card that could be another common or a foil card of Super Rare or higher, this should consider the draw "chance" of each card.
	const foilCard = getRandomCardByProbabilities(remainingCards, filteredRarityProbabilities);
	if (foilCard) {
		boosterPack.push(foilCard);
		remainingCards.splice(remainingCards.indexOf(foilCard), 1);
	} else {
		const commonCard = getRandomCardByRarity(remainingCards, 'Common');
		if (commonCard) {
			boosterPack.push(commonCard);
			remainingCards.splice(remainingCards.indexOf(commonCard), 1);
		}
	}

	return boosterPack;
};

function getRandomCardByRarity(cards, rarity) {
	const cardsOfRarity = cards.filter((card) => card.rarity === rarity);
	if (cardsOfRarity.length === 0) return null;
	const index = Math.floor(Math.random() * cardsOfRarity.length);
	return cardsOfRarity[index];
}

function getRandomCardByProbabilities(cards, rarityProbabilities) {
	const randomNumber = Math.random();

	const shuffledRarities = shuffle(rarityProbabilities);
	for (const rarity in shuffledRarities) {
		if (randomNumber <= shuffledRarities[rarity]) {
			const card = getRandomCardByRarity(cards, rarity);
			if (card) return card;
		}
	}

	// if no card has been returned yet, return a random card
	const index = Math.floor(Math.random() * cards.length);
	return cards[index];
}

export { createBoosterPack, openBoosterPack };

// For testing :)

// const rarities = Object.keys(rarityProbabilities);
// function testBoosterPackCreation(cards, numPacks) {
//   const rarityCounts = {};

//   for (const rarity of rarities) {
//     rarityCounts[rarity] = 0;
//   }

//   for (let i = 0; i < numPacks; i++) {
//     const boosterPack = createBoosterPack(cards);
//     for (const card of boosterPack) {
//       rarityCounts[card.rarity]++;
//     }
//   }

//   return rarityCounts;
// }

// let summary = testBoosterPackCreation(cards, 1000000); // open 1000000 packs :o
// console.table("result", summary);
