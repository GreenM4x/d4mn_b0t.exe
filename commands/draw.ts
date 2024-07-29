import {
	SlashCommandBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	AttachmentBuilder,
	ChatInputCommandInteraction,
	ButtonInteraction,
	EmbedBuilder,
	CollectorFilter,
	MessageComponentInteraction,
	ReadonlyCollection,
} from 'discord.js';
import { writeDb, getUserData } from '../db/dbFunctions.js';
import { getColorForCardType, getRandomCard } from '../shared/card.js';
import { DRAW_COMMAND_COOLDOWN, DRAW_TIMEOUT } from '../shared/variables.js';
import { add, check, remainingCooldown } from '../shared/cooldownManager.js';
import { createEmbed } from '../shared/utils.js';
import { type Binder } from '../shared/models/binder.models.js';
import { type CardEmbedData } from '../shared/models/card.models.js';

const COMMAND_NAME = 'draw';

const data = new SlashCommandBuilder()
	.setName(COMMAND_NAME)
	.setDescription('Draw a card every 15min');

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
	add(interaction.user.id, COMMAND_NAME, DRAW_COMMAND_COOLDOWN);
	const card = getRandomCard();

	const accept = new ButtonBuilder()
		.setCustomId('accept_button_id_draw')
		.setLabel('Place in Binder')
		.setStyle(ButtonStyle.Primary)
		.setEmoji('❤️');

	const sell = new ButtonBuilder()
		.setCustomId('sell_button_id_draw')
		.setLabel('Sell')
		.setStyle(ButtonStyle.Success)
		.setEmoji('💰');

	const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(accept, sell);

	const embed = createEmbed({
		title: card.name,
		color: getColorForCardType(card.type),
		fields: [
			{ name: 'Type', value: card.type, inline: true },
			{ name: 'Rarity', value: card.rarity, inline: true },
			{ name: 'Price', value: `${card.price}€`, inline: true },
		],
		timestamp: Date.now(),
		imageUrl: card.img,
	});

	await interaction.reply({
		embeds: [embed],
		components: [actionRow],
		files: [new AttachmentBuilder(`./db/images/${card.id}.jpg`, { name: `${card.id}.jpg` })],
	});

	const filter: CollectorFilter<[MessageComponentInteraction]> = (
		i: MessageComponentInteraction,
	) => {
		return i.user.id === interaction.user.id && i.isButton() && i.customId.includes('_id_draw');
	};
	const collector = interaction.channel!.createMessageComponentCollector({
		filter,
		time: DRAW_TIMEOUT,
	});

	collector.on('collect', async (i: ButtonInteraction) => {
		const binder = getUserData(interaction.user.id);
		if (i.customId === 'accept_button_id_draw') {
			await handleAccept(i, binder, card, embed);
		} else if (i.customId === 'sell_button_id_draw') {
			await handleSell(i, binder, card, embed);
		}
	});

	collector.on('end', async (collected) => {
		await handleCollectorEnd(interaction, collected, embed);
	});
}

async function handleAccept(
	i: ButtonInteraction,
	binder: Binder,
	card: CardEmbedData,
	embed: EmbedBuilder,
) {
	if (!binder || binder.cards.length === 0) {
		writeDb({
			userId: i.user.id,
			cards: [{ id: card.id, rarity: card.rarity }],
			stats: {
				cardsAddedToBinder: 1,
				cardsDiscarded: 0,
				cardsGifted: 0,
				cardsSold: 0,
			},
			currency: 0,
			dailyPurchases: { date: new Date().toLocaleDateString(), packs: {} },
		});
	} else {
		binder.cards.push({
			id: card.id,
			rarity: card.rarity,
		});
		binder.stats.cardsAddedToBinder++;
		writeDb(binder);
	}
	embed.setColor(0x00ff00); // Green color
	await i.update({ embeds: [embed], components: [] });
	await i.followUp({
		content: 'The card was sleeved and carefully put in your Binder!',
		ephemeral: true,
	});
}

async function handleSell(
	i: ButtonInteraction,
	binder: Binder,
	card: CardEmbedData,
	embed: EmbedBuilder,
) {
	embed.setColor(0xff0000); // Red color
	if (!binder || binder.cards.length === 0) {
		writeDb({
			userId: i.user.id,
			cards: [],
			stats: {
				cardsAddedToBinder: 0,
				cardsDiscarded: 0,
				cardsGifted: 0,
				cardsSold: 1,
			},
			currency: 0,
			dailyPurchases: { date: new Date().toLocaleDateString(), packs: {} },
		});
	} else {
		binder.stats.cardsSold++;
		binder.currency += parseFloat(card.price);
		writeDb(binder);
	}
	await i.update({ embeds: [embed], components: [] });
	await i.followUp({
		content: `You sold the card for ${card.price}€ to next best duellist on the street!`,
		ephemeral: true,
	});
}

async function handleCollectorEnd(
	interaction: ChatInputCommandInteraction,
	collected: ReadonlyCollection<string, MessageComponentInteraction>,
	embed: EmbedBuilder,
) {
	await interaction.editReply({
		embeds: [embed],
		components: [],
	});
	if (collected.size <= 0) {
		await interaction.followUp({
			content: 'You waited too long, the card disappeared into the shadow realm!',
			ephemeral: true,
		});
	}
}

export { data, execute };
