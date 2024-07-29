import {
	SlashCommandBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	AttachmentBuilder,
	ChatInputCommandInteraction,
	ButtonInteraction,
	type MessageActionRowComponentBuilder,
	type CollectorFilter,
	MessageComponentInteraction,
} from 'discord.js';
import { writeDb, getUserData } from '../db/dbFunctions.js';
import { getCardData, getColorForCardType } from '../shared/card.js';
import { GIFT_TIMEOUT } from '../shared/variables.js';
import { add, check, remainingCooldown } from '../shared/cooldownManager.js';
import { createEmbed } from '../shared/utils.js';
import { type BinderCard, type Binder } from '../shared/models/binder.models.js';

const COMMAND_NAME = 'gift';
const SOME_RANDOM_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

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

async function execute(interaction: ChatInputCommandInteraction) {
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

	const cardIndex = interaction.options.getInteger('card_index', true);
	const recipient = interaction.options.getUser('recipient', true);
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

	const cardToGift = senderBinder.cards[cardIndex - 1]!;
	const cardData = getCardData(cardToGift);

	if (!cardData) {
		return await interaction.reply({
			content: 'Error retrieving card data. Please try again.',
			ephemeral: true,
		});
	}

	const accept = new ButtonBuilder()
		.setCustomId('accept_gift_button_id_gift')
		.setLabel('Accept')
		.setStyle(ButtonStyle.Primary);

	const decline = new ButtonBuilder()
		.setCustomId('decline_gift_button_id_gift')
		.setLabel('Decline')
		.setStyle(ButtonStyle.Danger);

	const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
		accept,
		decline,
	);

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
		url: SOME_RANDOM_URL,
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

	const filter: CollectorFilter<[MessageComponentInteraction]> = (
		i: MessageComponentInteraction,
	) => i.customId.includes('id_gift');
	const collector = interaction.channel!.createMessageComponentCollector({
		filter,
		time: GIFT_TIMEOUT,
	});

	collector.on('collect', async (i: ButtonInteraction) => {
		if (i.user.id !== recipientId) {
			await i.reply({ content: 'Wooow buddy, this is not your gift!', ephemeral: true });
			return;
		}

		if (i.customId === 'accept_gift_button_id_gift') {
			await handleAcceptGift(
				i,
				interaction,
				senderBinder,
				cardIndex,
				cardToGift,
				recipientId,
			);
		} else if (i.customId === 'decline_gift_button_id_gift') {
			await handleDeclineGift(i, recipientId);
		}
		collector.stop();
	});

	collector.on('end', async (collected) => {
		if (collected.size === 0) {
			await interaction.editReply({
				content: `The gift offer has expired. Sucks for you, <@${recipientId}>!`,
				components: [],
			});
		} else {
			await interaction.editReply({
				components: [],
			});
		}
	});
}

async function handleAcceptGift(
	i: ButtonInteraction,
	interaction: ChatInputCommandInteraction,
	senderBinder: Binder,
	cardIndex: number,
	cardToGift: BinderCard,
	recipientId: string,
) {
	senderBinder.cards.splice(cardIndex - 1, 1);
	senderBinder.stats.cardsGifted++;
	writeDb(senderBinder);

	const recipientBinder = getUserData(recipientId) || {
		userId: recipientId,
		cards: [],
		stats: {
			cardsAddedToBinder: 0,
			cardsDiscarded: 0,
			cardsGifted: 0,
			cardsSold: 0,
		},
		currency: 0,
		dailyPurchases: { date: new Date().toLocaleDateString(), packs: {} },
	};
	recipientBinder.cards.push(cardToGift);
	writeDb(recipientBinder);

	await i.update({
		content: `Congratulations, <@${recipientId}>! You received the card!`,
		components: [],
	});
	await interaction.followUp({
		content: `<@${interaction.user.id}> successfully gifted their card to <@${recipientId}>!`,
	});
}

async function handleDeclineGift(i: ButtonInteraction, recipientId: string) {
	await i.update({
		content: `<@${recipientId}> just declined a gift. LOL`,
		components: [],
	});
}

export { data, execute };
