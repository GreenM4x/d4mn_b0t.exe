import {
	ActionRowBuilder,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	SlashCommandBuilder,
} from 'discord.js';

import { getUserData, writeDb } from '../db/dbFunctions.js';
import { getCardData, getColorForCardType } from '../shared/card.js';
import { add, check, remainingCooldown } from '../shared/cooldownManager.js';
import { createEmbed } from '../shared/utils.js';
import { GIFT_TIMEOUT } from '../shared/variables.js';

const COMMAND_NAME = 'gift';

const data = new SlashCommandBuilder()
	.setName(COMMAND_NAME)
	.setDescription('Gift a card from your binder to another duelist')
	.addIntegerOption((option) =>
		option
			.setName('card_index')
			.setDescription('ID of the card in your binder')
			.setRequired(true),
	)
	.addUserOption((option) =>
		option
			.setName('recipient')
			.setDescription('The duelist you want to gift the card to')
			.setRequired(true),
	);

async function execute(interaction) {
	if (check(interaction.user.id, COMMAND_NAME)) {
		return await interaction.reply({
			content: `You are on a cooldown. ${remainingCooldown(
				interaction.user.id,
				COMMAND_NAME,
			)} remaining`,
			ephemeral: true,
		});
	}
	add(interaction.user.id, COMMAND_NAME, GIFT_TIMEOUT);

	const cardIndex = interaction.options.getInteger('card_index');
	const recipient = interaction.options.getUser('recipient');
	const recipientId = recipient.id;

	if (interaction.user.id === recipientId) {
		return await interaction.reply({
			content: "What do you think you're doing?",
			ephemeral: true,
		});
	}

	const senderBinder = getUserData(interaction.user.id);
	if (!senderBinder || senderBinder.cards.length < cardIndex || cardIndex <= 0) {
		return await interaction.reply({
			content: 'Invalid card id. Please check your binder and try again.',
			ephemeral: true,
		});
	}

	const cardToGift = senderBinder.cards[cardIndex - 1];
	const cardData = getCardData(cardToGift);

	const accept = new ButtonBuilder()
		.setCustomId('accept_gift_button_id_gift')
		.setLabel('Accept')
		.setStyle(ButtonStyle.Primary);

	const decline = new ButtonBuilder()
		.setCustomId('decline_gift_button_id_gift')
		.setLabel('Decline')
		.setStyle(ButtonStyle.Danger);

	const actionRow = new ActionRowBuilder().addComponents(accept, decline);

	const embed = createEmbed({
		title: `${interaction.user.username} is gifting you a card!`,
		timestamp: Date.now(),
		imageUrl: cardData.img,
		color: getColorForCardType(cardData.type),
		fields: [
			{
				name: 'Name',
				value: cardData.name,
				inline: true,
			},
			{
				name: 'Rarity',
				value: cardData.rarity,
				inline: true,
			},
			{
				name: 'Price',
				value: cardData.price,
				inline: true,
			},
		],
		url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
	});

	await interaction.reply({
		content: `<@${recipientId}>, someone is gifting you a card!`,
		embeds: [embed],
		components: [actionRow],
		files: [
			new AttachmentBuilder(`./db/images/${cardData.id}.jpg`, {
				name: `${cardData.id}.jpg`,
			}),
		],
	});

	const filter = (i) => i.customId.includes('id_gift');
	const collector = interaction.channel.createMessageComponentCollector({
		filter,
		time: GIFT_TIMEOUT,
		maxButtons: 2,
	});

	collector.on('collect', async (i) => {
		if (i.user.id !== recipientId) {
			await i.reply({ content: 'Wooow buddy, this is not your gift!', ephemeral: true });
			return;
		}

		if (i.customId === 'accept_gift_button_id_gift') {
			senderBinder.cards.splice(cardIndex - 1, 1);
			senderBinder.stats.cardsGifted++;
			writeDb(senderBinder);

			const recipientBinder = getUserData(recipientId) || {
				userId: recipientId,
				cards: [],
			};
			recipientBinder.cards.push(cardToGift);
			writeDb(recipientBinder);

			await i.update({
				content: `Congratulations, <@${recipientId}>! You received the card!`,
				components: [],
			});
		} else if (i.customId === 'decline_gift_button_id_gift') {
			await i.update({
				content: `<@${recipientId}> just declined a gift. LOL`,
				components: [],
			});
		}
	});

	collector.on('end', async (collected) => {
		if (collected.size === 0) {
			await interaction.editReply({
				content: `The gift offer has expired. Sucks for you, <@${recipientId}>!`,
				components: [],
			});
		}
	});
}

export { data, execute };
