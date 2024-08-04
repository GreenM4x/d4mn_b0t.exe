import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	AttachmentBuilder,
} from 'discord.js';
import { readDb, writeDb } from '../db/dbFunctions.js';
import { getCardData } from '../shared/card.js';
import { createEmbed } from '../shared/utils.js';
import { Binder } from '../shared/models/binder.models.js';

const data = new SlashCommandBuilder()
	.setName('delete')
	.setDescription('Send a card from your Binder into the Shadow Realm!')
	.addStringOption((option) =>
		option
			.setName('id')
			.setDescription('Position of the card in your binder, you want to delete')
			.setRequired(true),
	);

async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	const allData: Binder[] = readDb();
	const binder = allData.find((data) => data.userId === interaction.user.id);

	if (!binder || binder.cards.length === 0) {
		await interaction.reply({
			content: `You don't have any cards. Try the /draw command first`,
			ephemeral: true,
		});
		return;
	}

	const cardDelIndex = parseInt(interaction.options.getString('id', true)) - 1;

	if (cardDelIndex < 0 || cardDelIndex >= binder.cards.length || isNaN(cardDelIndex)) {
		await interaction.reply({
			content: 'Please enter a valid Id',
			ephemeral: true,
		});
		return;
	}

	const cardToDelete = binder.cards[cardDelIndex];
	const cardData = getCardData(cardToDelete!);

	if (!cardData) {
		await interaction.reply({
			content: 'Error retrieving card data.',
			ephemeral: true,
		});
		return;
	}

	const embed = createEmbed({
		title: `Delete ${cardData.name}?`,
		description: 'Are you sure you want to delete this card?',
		fields: [
			{ name: 'Type', value: cardData.type, inline: true },
			{ name: 'Rarity', value: cardData.rarity, inline: true },
			{ name: 'Price', value: `${cardData.price}€`, inline: true },
		],
		imageUrl: `attachment://${cardData.id}.jpg`,
	});

	const confirmButton = new ButtonBuilder()
		.setCustomId('confirm_delete')
		.setLabel('Confirm Delete')
		.setStyle(ButtonStyle.Danger);

	const cancelButton = new ButtonBuilder()
		.setCustomId('cancel_delete')
		.setLabel('Cancel')
		.setStyle(ButtonStyle.Secondary);

	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);

	const response = await interaction.reply({
		embeds: [embed],
		components: [row],
		files: [new AttachmentBuilder(`./db/images/${cardData.id}.jpg`)],
		fetchReply: true,
	});

	try {
		const confirmation = await response.awaitMessageComponent({
			filter: (i) => i.user.id === interaction.user.id,
			time: 30000,
		});

		if (confirmation.customId === 'confirm_delete') {
			binder.cards.splice(cardDelIndex, 1);
			const binderIndex = allData.findIndex((data) => data.userId === interaction.user.id);
			if (binderIndex !== -1) {
				allData[binderIndex] = binder;
				writeDb(binder); // Write the updated binder
			}

			await confirmation.update({
				content: 'Your card was deleted!',
				embeds: [],
				components: [],
				files: [],
			});
		} else {
			await confirmation.update({
				content: 'Card deletion cancelled.',
				embeds: [],
				components: [],
				files: [],
			});
		}
	} catch (e) {
		await interaction.editReply({
			content: 'Confirmation not received within 30 seconds, cancelling deletion.',
			embeds: [],
			components: [],
		});
	}
}

export { data, execute };
