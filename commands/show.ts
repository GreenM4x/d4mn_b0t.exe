import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import { getCardData, getColorForCardType } from '../shared/card.js';
import { getUserData } from '../db/dbFunctions.js';
import { createEmbed } from '../shared/utils.js';

const COMMAND_NAME = 'show';

const data = new SlashCommandBuilder()
	.setName(COMMAND_NAME)
	.setDescription('Show a specific card from your binder')
	.addStringOption((option) =>
		option.setName('card_id').setDescription('The ID of the card to show').setRequired(true),
	);
async function execute(interaction) {
	const cardIndex = +interaction.options.getString('card_id') - 1;
	const binder = await getUserData(interaction.user.id);
	if (!binder || binder.cards.length === 0) {
		return await interaction.reply({
			content: "You don't have any cards. Try the /draw command first",
			ephemeral: true,
		});
	} else if (binder.cards.length > 0 && binder.cards[cardIndex] === undefined) {
		return await interaction.reply({
			content: "You don't have this card.",
			ephemeral: true,
		});
	}

	const card = binder.cards[cardIndex];
	const cardData = getCardData(card);

	if (!cardData) {
		return await interaction.reply({
			content: 'Card not found.',
			ephemeral: true,
		});
	}

	const cardEmbed = createEmbed({
		title: cardData.name,
		color: getColorForCardType(cardData.type),
		fields: [
			{ name: 'Type', value: cardData.type, inline: true },
			{ name: 'Rarity', value: cardData.rarity, inline: true },
			{ name: 'Price', value: `${cardData.price}€`, inline: true },
		],
		imageUrl: cardData.img,
		footer: { text: `This card belongs to ${interaction.user.username}` },
	});

	const cardAttachment = new AttachmentBuilder(`./db/images/${cardData.id}.jpg`, {
		name: `${cardData.id}.jpg`,
	});

	await interaction.reply({
		embeds: [cardEmbed],
		files: [cardAttachment],
	});
}

export { data, execute };
