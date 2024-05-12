import {
	ActionRowBuilder,
	StringSelectMenuBuilder,
	AttachmentBuilder,
	EmbedBuilder,
	ButtonBuilder,
	ButtonStyle,
	SlashCommandBuilder,
} from 'discord.js';
import { getUserData, writeDb } from '../db/dbFunctions.js';
import { getCardData } from '../shared/card.js';
import { TRADE_COOLDOWN } from '../shared/variables.js';
import { add, check, remainingCooldown } from '../shared/cooldownManager.js';

const COMMAND_NAME = 'trade';
const SOME_RANDOM_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

const data = new SlashCommandBuilder()
	.setName(COMMAND_NAME)
	.setDescription('Trade cards with another duelist')
	.addUserOption((option) =>
		option.setName('user').setDescription('The duelist to trade with').setRequired(true),
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
	add(interaction.user.id, COMMAND_NAME, TRADE_COOLDOWN);

	const targetUser = interaction.options.getUser('user');
	if (targetUser.bot) {
		return await interaction.reply({
			content: 'You cannot trade with bots.',
			ephemeral: true,
		});
	}

	const userBinder = await getUserData(interaction.user.id);
	const targetBinder = await getUserData(targetUser.id);

	if (!userBinder || userBinder.cards.length === 0) {
		return await interaction.reply({
			content: "You don't have any cards to trade.",
			ephemeral: true,
		});
	}

	if (!targetBinder || targetBinder.cards.length === 0) {
		return await interaction.reply({
			content: `${targetUser.username} doesn't have any cards to trade.`,
			ephemeral: true,
		});
	}

	// max 25 options
	let userSelectMenu = new StringSelectMenuBuilder()
		.setCustomId('user_select_trade')
		.setPlaceholder(`Choose a card from ${interaction.user.username}'s binder`)
		.addOptions(
			userBinder.cards
				.map((card, index) => ({
					label: `${getCardData(card).name} - ${getCardData(card).rarity} - ${getCardData(card).price}€`,
					value: index.toString(),
				}))
				.slice(0, 25),
		);

	let targetSelectMenu = new StringSelectMenuBuilder()
		.setCustomId('target_select_trade')
		.setPlaceholder(`Choose a card from ${targetUser.username}'s binder`)
		.addOptions(
			targetBinder.cards
				.map((card, index) => ({
					label: `${getCardData(card).name} - ${getCardData(card).rarity} - ${getCardData(card).price}€`,
					value: index.toString(),
				}))
				.slice(0, 25),
		);

	let userActionRow = new ActionRowBuilder().addComponents(userSelectMenu);
	let targetActionRow = new ActionRowBuilder().addComponents(targetSelectMenu);

	let tradeEmbed = new EmbedBuilder()
		.setTitle(`Trade Preview`)
		.setURL(SOME_RANDOM_URL)
		.setDescription('Select cards from both binders to preview the trade.');

	const imageEmbeds = [
		new EmbedBuilder().setImage(`attachment://back.webp`).setURL(SOME_RANDOM_URL),
		new EmbedBuilder().setImage(`attachment://back.webp`).setURL(SOME_RANDOM_URL),
	];
	const attachments = [
		new AttachmentBuilder(`./db/images/back.webp`, {
			name: `back.webp`,
		}),
		new AttachmentBuilder(`./db/images/back.webp`, {
			name: `back.webp`,
		}),
	];

	const cancelTradeButton = new ButtonBuilder()
		.setCustomId('cancel_trade')
		.setLabel('Cancel Trade')
		.setStyle(ButtonStyle.Secondary);

	let tradeActionRow = new ActionRowBuilder().addComponents(cancelTradeButton);

	await interaction.reply({
		content: `Trade a card with <@${targetUser.id}>!`,
		embeds: [tradeEmbed, ...imageEmbeds],
		components: [userActionRow, targetActionRow, tradeActionRow],
		files: [...attachments],
	});

	let userSelectedCardIndex, targetSelectedCardIndex;
	let userCardToTrade, targetCardToTrade;
	let userAccepted = false;
	let targetUserAccepted = false;
	const createTradeEmbedFields = () => {
		const fields = [];

		if (userSelectedCardIndex === undefined && targetSelectedCardIndex !== undefined) {
			fields.push(setTradeField(targetUser.username, targetCardToTrade));
		} else if (userSelectedCardIndex !== undefined && targetSelectedCardIndex === undefined) {
			fields.push(setTradeField(interaction.user.username, userCardToTrade));
		} else if (userSelectedCardIndex !== undefined && targetSelectedCardIndex !== undefined) {
			fields.push(
				setTradeField(interaction.user.username, userCardToTrade),
				setTradeField(targetUser.username, targetCardToTrade),
			);
		}

		return fields;
	};

	const updateTradeActionRow = () => {
		const nbAccepted = (userAccepted ? 1 : 0) + (targetUserAccepted ? 1 : 0);
		const acceptTradeButton = new ButtonBuilder()
			.setCustomId('accept_trade')
			.setLabel(`Accept Trade ${nbAccepted}/2`)
			.setStyle(ButtonStyle.Success);

		if (userSelectedCardIndex !== undefined && targetSelectedCardIndex !== undefined) {
			tradeActionRow = new ActionRowBuilder().addComponents(
				acceptTradeButton,
				cancelTradeButton,
			);
		}
	};

	const updateTradeImageEmbeds = () => {
		if (userSelectedCardIndex !== undefined) {
			createCardEmbed(userCardToTrade, 0);
		} else {
			createCardEmbed(null, 0);
		}

		if (targetSelectedCardIndex !== undefined) {
			createCardEmbed(targetCardToTrade, 1);
		} else {
			createCardEmbed(null, 1);
		}
	};

	const updateTradeEmbed = async () => {
		if (userSelectedCardIndex !== undefined || targetSelectedCardIndex !== undefined) {
			tradeEmbed.setURL(SOME_RANDOM_URL);

			if (userSelectedCardIndex !== undefined) {
				userCardToTrade = getCardData(userBinder.cards[userSelectedCardIndex]);
				userActionRow = createSelectMenu(
					userBinder,
					userSelectedCardIndex,
					'user_select_trade',
				);
			}

			if (targetSelectedCardIndex !== undefined) {
				targetCardToTrade = getCardData(targetBinder.cards[targetSelectedCardIndex]);
				targetActionRow = createSelectMenu(
					targetBinder,
					targetSelectedCardIndex,
					'target_select_trade',
				);
			}

			tradeEmbed.setFields(createTradeEmbedFields());
			updateTradeActionRow();
			updateTradeImageEmbeds();

			await interaction.editReply({
				embeds: [tradeEmbed, ...imageEmbeds],
				components: [userActionRow, targetActionRow, tradeActionRow],
				files: [...attachments],
			});
		}
	};

	const filter = (i) =>
		(i.user.id === interaction.user.id || i.user.id === targetUser.id) &&
		(i.customId === 'cancel_trade' ||
			i.customId === 'accept_trade' ||
			i.customId === 'user_select_trade' ||
			i.customId === 'target_select_trade');
	const collector = interaction.channel.createMessageComponentCollector({
		filter,
		time: TRADE_COOLDOWN,
	});

	collector.on('collect', async (i) => {
		await i.deferUpdate();
		if (i.customId === 'user_select_trade' || i.customId === 'target_select_trade') {
			const isUserSelection = i.customId === 'user_select_trade';
			const selectedCardIndex = parseInt(i.values[0]);

			if (isUserSelection) {
				userSelectedCardIndex = selectedCardIndex;
			} else {
				targetSelectedCardIndex = selectedCardIndex;
			}

			userAccepted = false;
			targetUserAccepted = false;
			await updateTradeEmbed();
		}

		if (i.customId === 'accept_trade') {
			if (i.user.id === interaction.user.id) {
				userAccepted = true;
			} else if (i.user.id === targetUser.id) {
				targetUserAccepted = true;
			}
			await updateTradeEmbed();
			if (userAccepted && targetUserAccepted) {
				const temp = userBinder.cards[userSelectedCardIndex];
				userBinder.cards[userSelectedCardIndex] =
					targetBinder.cards[targetSelectedCardIndex];
				targetBinder.cards[targetSelectedCardIndex] = temp;

				writeDb(userBinder);
				writeDb(targetBinder);

				await disableTradeEmbed();
				await interaction.followUp({
					content: `${interaction.user.username} successfully traded **${userCardToTrade.name}** with ${targetUser.username}'s **${targetCardToTrade.name}**.`,
				});
				cooldownManager.remove(interaction.user.id, COMMAND_NAME);

				collector.stop();
			}
		} else if (i.customId === 'cancel_trade') {
			await disableTradeEmbed();
			await interaction.followUp({
				content: 'Trade canceled.',
			});
			cooldownManager.remove(interaction.user.id, COMMAND_NAME);
			collector.stop();
		}
	});

	collector.on('end', async (collected, reason) => {
		if (reason === 'time') {
			await disableTradeEmbed();
			await interaction.followUp({
				content: 'Trade session timed out. No trade occurred.',
			});
		}
		cooldownManager.remove(interaction.user.id, COMMAND_NAME);
	});

	async function disableTradeEmbed() {
		userActionRow?.components.forEach((component) => {
			component.setDisabled(true);
		});

		targetActionRow?.components.forEach((component) => {
			component.setDisabled(true);
		});

		tradeActionRow?.components.forEach((component) => {
			component.setDisabled(true);
		});

		await interaction.editReply({
			components: [userActionRow, targetActionRow, tradeActionRow],
		});
	}

	const createCardEmbed = (cardToTrade, index) => {
		const imageEmbed = new EmbedBuilder()
			.setImage(cardToTrade ? `attachment://${cardToTrade.id}.jpg` : `attachment://back.webp`)
			.setURL(SOME_RANDOM_URL);

		const attachment = new AttachmentBuilder(
			cardToTrade ? `./db/images/${cardToTrade.id}.jpg` : `./db/images/back.webp`,
			{
				name: cardToTrade ? `${cardToTrade.id}.jpg` : `back.webp`,
			},
		);

		imageEmbeds[index] = imageEmbed;
		attachments[index] = attachment;
	};

	const setTradeField = (username, card) => {
		return {
			name: `${username}'s Card`,
			value: `${card.name} - ${card.rarity} - ${card.price}€`,
		};
	};

	const createSelectMenu = (binder, selectedCardIndex, customId) => {
		const cardToTrade = getCardData(binder.cards[selectedCardIndex]);

		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId(customId)
			.setPlaceholder(cardToTrade.name)
			.addOptions(
				binder.cards
					.map((card, index) => ({
						label: `${getCardData(card).name} - ${getCardData(card).rarity} - ${getCardData(card).price}€`,
						value: index.toString(),
						default: index === selectedCardIndex,
					}))
					.slice(0, 25),
			);

		return new ActionRowBuilder().addComponents(selectMenu);
	};
}

export { data, execute };
