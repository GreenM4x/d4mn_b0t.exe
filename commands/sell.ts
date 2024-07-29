import {
	SlashCommandBuilder,
	ButtonBuilder,
	ActionRowBuilder,
	ButtonStyle,
	AttachmentBuilder,
	ChatInputCommandInteraction,
	ButtonInteraction,
	MessageActionRowComponentBuilder,
	CollectorFilter,
	MessageComponentInteraction,
	EmbedBuilder,
} from 'discord.js';
import { getUserData, writeDb } from '../db/dbFunctions.js';
import { getColorForCardType, getCardData } from '../shared/card.js';
import { createEmbed } from '../shared/utils.js';
import { Binder } from '../shared/models/binder.models.js';
import { CardEmbedData } from '../shared/models/card.models.js';

const data = new SlashCommandBuilder()
	.setName('sell')
	.setDescription('Sell a card from your binder')
	.addStringOption((option) =>
		option
			.setName('card_id')
			.setDescription('The ID of the card you want to sell')
			.setRequired(true),
	);

async function execute(interaction: ChatInputCommandInteraction) {
	const cardIndex = parseInt(interaction.options.getString('card_id', true)) - 1;
	const binder = getUserData(interaction.user.id);

	if (!binder || binder.cards.length === 0) {
		return await interaction.reply({
			content: "You don't have any cards in your binder.",
			ephemeral: true,
		});
	}

	const card = getCardData(binder.cards[cardIndex]!);

	if (!card) {
		return await interaction.reply({
			content: "You don't have this card in your binder.",
			ephemeral: true,
		});
	}

	const cardValue = card.price;

	const embed = createEmbed({
		title: `Sell ${card.name}?`,
		description: `Are you sure you want to sell this card?`,
		color: getColorForCardType(card.type),
		fields: [
			{ name: 'Type', value: card.type, inline: true },
			{ name: 'Rarity', value: card.rarity, inline: true },
			{ name: 'Price', value: `${card.price}€`, inline: true },
		],
		timestamp: Date.now(),
		imageUrl: card.img,
	});

	const accept = new ButtonBuilder()
		.setCustomId('sell_accept_button_id')
		.setLabel('Confirm')
		.setStyle(ButtonStyle.Primary)
		.setEmoji('💰');

	const denial = new ButtonBuilder()
		.setCustomId('sell_denial_button_id')
		.setLabel('Cancel')
		.setStyle(ButtonStyle.Danger)
		.setEmoji('✖️');

	const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
		accept,
		denial,
	);

	await interaction.reply({
		embeds: [embed],
		components: [actionRow],
		files: [
			new AttachmentBuilder(`./db/images/${card.id}.jpg`, {
				name: `${card.id}.jpg`,
			}),
		],
	});

	const filter: CollectorFilter<[MessageComponentInteraction]> = (
		i: MessageComponentInteraction,
	) => i.user.id === interaction.user.id && i.customId.startsWith('sell_');
	const collector = interaction.channel!.createMessageComponentCollector({
		filter,
		time: 10000,
	});

	collector.on('collect', async (i: ButtonInteraction) => {
		if (i.customId === 'sell_accept_button_id') {
			await handleSellAccept(i, binder, cardIndex, card, cardValue, embed);
		} else if (i.customId === 'sell_denial_button_id') {
			await handleSellDenial(i, embed);
		}
	});
}

async function handleSellAccept(
	i: ButtonInteraction,
	binder: Binder,
	cardIndex: number,
	card: CardEmbedData,
	cardValue: string,
	embed: EmbedBuilder,
) {
	binder.cards.splice(cardIndex, 1);
	binder.currency += parseFloat(cardValue);
	writeDb(binder);

	embed.setColor(0x00ff00);
	embed.setDescription('You successfully sold the card!');

	await i.update({ embeds: [embed], components: [] });
	await i.followUp({
		content: `You sold ${card.name} for ${parseFloat(cardValue)}€!`,
		ephemeral: true,
	});
}

async function handleSellDenial(i: ButtonInteraction, embed: EmbedBuilder) {
	embed.setColor(0xff0000);
	embed.setDescription('Sale canceled.');

	await i.update({ embeds: [embed], components: [] });
	await i.followUp({
		content: 'You decided not to sell the card.',
		ephemeral: true,
	});
}

export { data, execute };
