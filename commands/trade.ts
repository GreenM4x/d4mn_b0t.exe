import {
	ActionRowBuilder,
	StringSelectMenuBuilder,
	AttachmentBuilder,
	EmbedBuilder,
	ButtonBuilder,
	ButtonStyle,
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	MessageComponentInteraction,
	CollectorFilter,
} from 'discord.js';
import { getUserData, writeDb } from '../db/dbFunctions.js';
import { getCardData } from '../shared/card.js';
import { TRADE_COOLDOWN } from '../shared/variables.js';
import { add, check, remainingCooldown, remove } from '../shared/cooldownManager.js';
import { type Binder } from '../shared/models/binder.models.js';
import { type CardEmbedData } from '../shared/models/card.models.js';

const COMMAND_NAME = 'trade';
const SOME_RANDOM_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

const data = new SlashCommandBuilder()
	.setName(COMMAND_NAME)
	.setDescription('Trade cards with another duelist')
	.addUserOption((option) =>
		option.setName('user').setDescription('The duelist to trade with').setRequired(true),
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
	add(interaction.user.id, COMMAND_NAME, TRADE_COOLDOWN);

	const targetUser = interaction.options.getUser('user', true);
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
			content: `<@${targetUser.id}> doesn't have any cards to trade.`,
			ephemeral: true,
		});
	}

	let userSelectMenu = createSelectMenu(
		'user_select_trade',
		interaction.user.tag,
		userBinder,
	);
	let targetSelectMenu = createSelectMenu(
		'target_select_trade',
		targetUser.tag,
		targetBinder,
	);

	let tradeEmbed = new EmbedBuilder()
		.setTitle(`Trade Preview`)
		.setURL(SOME_RANDOM_URL)
		.setDescription('Select cards from both binders to preview the trade.');

	const imageEmbeds = [
		new EmbedBuilder().setImage(`attachment://back.webp`).setURL(SOME_RANDOM_URL),
		new EmbedBuilder().setImage(`attachment://back.webp`).setURL(SOME_RANDOM_URL),
	];
	const attachments = [
		new AttachmentBuilder(`./db/images/back.webp`, { name: `back.webp` }),
	];

	const cancelTradeButton = new ButtonBuilder()
		.setCustomId('cancel_trade')
		.setLabel('Cancel Trade')
		.setStyle(ButtonStyle.Secondary);

	let tradeActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(cancelTradeButton);

	await interaction.reply({
		content: `Trade a card with <@${targetUser.id}>!`,
		embeds: [tradeEmbed, ...imageEmbeds],
		components: [userSelectMenu, targetSelectMenu, tradeActionRow],
		files: attachments,
	});

	let userSelectedCardIndex: number | undefined, targetSelectedCardIndex: number | undefined;
	let userCardToTrade: CardEmbedData | undefined, targetCardToTrade: CardEmbedData | undefined;
	let userAccepted = false;
	let targetUserAccepted = false;

	const filter: CollectorFilter<[MessageComponentInteraction]> = (i) =>
		(i.user.id === interaction.user.id || i.user.id === targetUser.id) &&
		(i.customId === 'cancel_trade' ||
			i.customId === 'accept_trade' ||
			i.customId === 'user_select_trade' ||
			i.customId === 'target_select_trade');

	const collector = interaction.channel!.createMessageComponentCollector({
		filter,
		time: TRADE_COOLDOWN,
	});

	collector.on('collect', async (i: MessageComponentInteraction) => {
		await i.deferUpdate();
		if (i.isStringSelectMenu()) {
			const isUserSelection = i.customId === 'user_select_trade';
			const selectedCardIndex = parseInt(i.values[0]!);

			if (isUserSelection) {
				userSelectedCardIndex = selectedCardIndex;
			} else {
				targetSelectedCardIndex = selectedCardIndex;
			}

			userAccepted = false;
			targetUserAccepted = false;
			await updateTradeEmbed();
		} else if (i.isButton()) {
			if (i.customId === 'accept_trade') {
				if (i.user.id === interaction.user.id) {
					userAccepted = true;
				} else if (i.user.id === targetUser.id) {
					targetUserAccepted = true;
				}
				await updateTradeEmbed();
				if (userAccepted && targetUserAccepted) {
					await finalizeTrade(
						interaction,
						userBinder,
						targetBinder,
						userSelectedCardIndex!,
						targetSelectedCardIndex!,
						userCardToTrade!,
						targetCardToTrade!,
					);
					remove(interaction.user.id, COMMAND_NAME);
					collector.stop();
				}
			} else if (i.customId === 'cancel_trade') {
				await disableTradeEmbed();
				await interaction.followUp({
					content: 'Trade canceled.',
				});
				remove(interaction.user.id, COMMAND_NAME);
				collector.stop();
			}
		}
	});

	collector.on('end', async (collected, reason) => {
		if (reason === 'time') {
			await disableTradeEmbed();
			await interaction.followUp({
				content: 'Trade session timed out. No trade occurred.',
			});
		}
		remove(interaction.user.id, COMMAND_NAME);
	});

	async function updateTradeEmbed() {
		if (userSelectedCardIndex !== undefined || targetSelectedCardIndex !== undefined) {
			tradeEmbed.setURL(SOME_RANDOM_URL);

			if (userSelectedCardIndex !== undefined) {
				userCardToTrade = getCardData(userBinder.cards[userSelectedCardIndex]!)!;
				userSelectMenu = createSelectMenu(
					'user_select_trade',
					interaction.user.tag,
					userBinder,
					userSelectedCardIndex,
				);
			}

			if (targetSelectedCardIndex !== undefined) {
				targetCardToTrade = getCardData(targetBinder.cards[targetSelectedCardIndex]!)!;
				targetSelectMenu = createSelectMenu(
					'target_select_trade',
					targetUser.tag,
					targetBinder,
					targetSelectedCardIndex,
				);
			}

			tradeEmbed.setFields(
				createTradeEmbedFields(
					interaction.user.tag,
					targetUser.tag,
					userCardToTrade,
					targetCardToTrade,
				),
			);
			updateTradeActionRow();
			updateTradeImageEmbeds();

			await interaction.editReply({
				embeds: [tradeEmbed, ...imageEmbeds],
				components: [userSelectMenu, targetSelectMenu, tradeActionRow],
				files: [...attachments],
			});
		}
	}

	async function disableTradeEmbed() {
		userSelectMenu.components.forEach((component) => {
			component.setDisabled(true);
		});

		targetSelectMenu.components.forEach((component) => {
			component.setDisabled(true);
		});

		tradeActionRow.components.forEach((component) => {
			component.setDisabled(true);
		});

		await interaction.editReply({
			components: [userSelectMenu, targetSelectMenu, tradeActionRow],
		});
	}

	function updateTradeActionRow() {
		const nbAccepted = (userAccepted ? 1 : 0) + (targetUserAccepted ? 1 : 0);
		const acceptTradeButton = new ButtonBuilder()
			.setCustomId('accept_trade')
			.setLabel(`Accept Trade ${nbAccepted}/2`)
			.setStyle(ButtonStyle.Success);

		if (userSelectedCardIndex !== undefined && targetSelectedCardIndex !== undefined) {
			tradeActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				acceptTradeButton,
				cancelTradeButton,
			);
		}
	}

	function updateTradeImageEmbeds() {
		if (userSelectedCardIndex !== undefined) {
			createCardEmbed(userCardToTrade!, 0);
		} else {
			createCardEmbed(null, 0);
		}

		if (targetSelectedCardIndex !== undefined) {
			createCardEmbed(targetCardToTrade!, 1);
		} else {
			createCardEmbed(null, 1);
		}
	}

	function createCardEmbed(cardToTrade: CardEmbedData | null, index: number) {
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
	}

	async function finalizeTrade(
		interaction: ChatInputCommandInteraction,
		userBinder: Binder,
		targetBinder: Binder,
		userCardIndex: number,
		targetCardIndex: number,
		userCard: CardEmbedData,
		targetCard: CardEmbedData,
	) {
		const temp = userBinder.cards[userCardIndex];
		userBinder.cards[userCardIndex] = targetBinder.cards[targetCardIndex]!;
		targetBinder.cards[targetCardIndex] = temp!;
	
		writeDb(userBinder);
		writeDb(targetBinder);
	
		await disableTradeEmbed();
		await interaction.followUp({
			content: `<@${interaction.user.id}> successfully traded **${userCard.name}** with <@${targetUser.id}>'s **${targetCard.name}**.`,
		});
	}
}

function createSelectMenu(
	customId: string,
	userId: string,
	binder: Binder,
	selectedCardIndex?: number,
) {
	const selectMenu = new StringSelectMenuBuilder()
		.setCustomId(customId)
		.setPlaceholder(`Choose a card from ${userId}'s binder`);

	binder.cards.slice(0, 25).forEach((card, index) => {
		const cardData = getCardData(card);
		if (cardData) {
			selectMenu.addOptions({
				label: `${cardData.name} - ${cardData.rarity} - ${cardData.price}€`,
				value: index.toString(),
				default: index === selectedCardIndex,
			});
		}
	});

	return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
}

function createTradeEmbedFields(
	userId1: string,
	userId2: string,
	card1?: CardEmbedData,
	card2?: CardEmbedData,
) {
	const fields = [];

	if (card1 && !card2) {
		fields.push(setTradeField(userId1, card1));
	} else if (!card1 && card2) {
		fields.push(setTradeField(userId2, card2));
	} else if (card1 && card2) {
		fields.push(setTradeField(userId1, card1), setTradeField(userId2, card2));
	}

	return fields;
}

function setTradeField(userId: string, card: CardEmbedData) {
	return {
		name: `${userId}'s Card`,
		value: `${card.name} - ${card.rarity} - ${card.price}€`,
	};
}



export { data, execute };
