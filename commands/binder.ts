import {
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	EmbedBuilder,
	AttachmentBuilder,
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	StringSelectMenuBuilder,
	MessageComponentInteraction,
	type MessageActionRowComponentBuilder,
} from 'discord.js';
import { getUserData } from '../db/dbFunctions.js';
import { CARDS_PER_PAGE, BINDER_TIMEOUT, BINDER_COMMAND_COOLDOWN } from '../shared/variables.js';
import { getCardData } from '../shared/card.js';
import { add, check, remainingCooldown } from '../shared/cooldownManager.js';
import { createFilterMenu, filterCards, sortCards, createSortMenu } from '../shared/utils.js';
import { type CardEmbedData } from '../shared/models/card.models.js';

const COMMAND_NAME = 'binder';
const SOME_RANDOM_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

const data = new SlashCommandBuilder()
	.setName(COMMAND_NAME)
	.setDescription('Show the cards you collected');

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
	add(interaction.user.id, COMMAND_NAME, BINDER_COMMAND_COOLDOWN);

	const binder = await getUserData(interaction.user.id);
	const userName = interaction.user.username;
	const userAvatar = interaction.user.displayAvatarURL();

	if (!binder || binder.cards.length === 0) {
		return await interaction.reply({
			content: "You don't have any cards. Try the /draw command first",
			ephemeral: true,
		});
	}
	const cardDataWithIndex: [CardEmbedData, number][] = binder.cards.map((card, index) => [
		getCardData(card)!,
		index,
	]);

	const leftPage = new ButtonBuilder()
		.setCustomId('leftPage_button_id_binder')
		.setStyle(ButtonStyle.Secondary)
		.setEmoji('◀️');

	const rightPage = new ButtonBuilder()
		.setCustomId('rightPage_button_id_binder')
		.setStyle(ButtonStyle.Secondary)
		.setEmoji('▶️');

	const filterIconButton = new ButtonBuilder()
		.setCustomId('filterIconButton_binder')
		.setStyle(ButtonStyle.Secondary)
		.setEmoji('🔍');

	const sortIconButton = new ButtonBuilder()
		.setCustomId('sortIconButton_binder')
		.setStyle(ButtonStyle.Secondary)
		.setEmoji('🔃');

	let currentPage = 1;
	let actionRow: ActionRowBuilder<MessageActionRowComponentBuilder>;
	let activeFilters: string[] | undefined;
	let activeSort: string | undefined;
	let totalPages: number;

	function binderBuilder(filterMenuVisible = false, sortMenuVisible = false) {
		filterMenuVisible =
			filterMenuVisible || ((activeFilters && activeFilters.length > 0) ?? false);
		sortMenuVisible = sortMenuVisible || !!activeSort;

		const filteredAndSortedCards = sortCards(
			filterCards(cardDataWithIndex, activeFilters),
			activeSort,
		);

		totalPages = Math.ceil(filteredAndSortedCards.length / CARDS_PER_PAGE);
		const startIndex = (currentPage - 1) * CARDS_PER_PAGE;
		const endIndex = startIndex + CARDS_PER_PAGE;
		const cardsOnPage = filteredAndSortedCards.slice(startIndex, endIndex);

		const typeRarityFilterMenu = createFilterMenu(
			cardDataWithIndex.map(([card]) => card),
			activeFilters,
		);
		const filterMenuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			filterMenuVisible ? typeRarityFilterMenu : ([] as any),
		);
		const sortMenu = createSortMenu(activeSort);
		const sortMenuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			sortMenuVisible ? sortMenu : ([] as any),
		);

		const embed = new EmbedBuilder()
			.setTitle(`${userName}'s Binder`)
			.setFooter({ text: `Page ${currentPage}/${totalPages}` })
			.setThumbnail(userAvatar)
			.setTimestamp(Date.now())
			.setURL(SOME_RANDOM_URL);
		const imageEmbeds: EmbedBuilder[] = [];
		const attachments: AttachmentBuilder[] = [];
		cardsOnPage.forEach(([card, originalIndex]) => {
			embed.addFields(
				{ name: `[${originalIndex + 1}] Name`, value: card.name, inline: true },
				{ name: 'Rarity', value: card.rarity, inline: true },
				{ name: 'Price', value: `${card.price}€`, inline: true },
			);
			attachments.push(
				new AttachmentBuilder(`./db/images/${card.id}.jpg`, { name: `${card.id}.jpg` }),
			);
			imageEmbeds.push(
				new EmbedBuilder().setImage(`attachment://${card.id}.jpg`).setURL(SOME_RANDOM_URL),
			);
		});

		let description = ' ';
		if (activeFilters?.length && cardsOnPage?.length) {
			description += `Filter: ${activeFilters
				?.map((filter) => filter.split('_')[1])
				.join(', ')} \n`;
		}
		if (activeSort && cardsOnPage?.length) {
			description += `Sort: ${activeSort.split('_')[1]}`;
		}
		if (activeFilters || activeSort) {
			embed.setDescription(description);
		}

		if (!cardsOnPage.length) {
			embed.setDescription('No cards found');
		}

		const embeds = [embed, ...imageEmbeds];

		const actionRowElements = [
			totalPages > 1 ? leftPage : null,
			totalPages > 1 ? rightPage : null,
			filterIconButton,
			sortIconButton,
		];
		actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
			actionRowElements.filter((element): element is ButtonBuilder => element !== null),
		);

		const rows = [filterMenuRow, sortMenuRow, actionRow];
		if (!actionRow.components.length) {
			return {
				embeds,
				files: attachments,
				components: rows.filter((row) => row.components.length > 0),
			};
		}
		return {
			embeds,
			components: rows.filter((row) => row.components.length > 0),
			files: attachments,
		};
	}

	await interaction.reply(await binderBuilder());

	const filter = (i: MessageComponentInteraction) =>
		i.user.id === interaction.user.id &&
		(i.customId.includes('Page_button_id_binder') ||
			i.customId.includes('_select_id_binder') ||
			i.customId.includes('IconButton_binder'));
	const collector = interaction.channel!.createMessageComponentCollector({
		filter,
		time: BINDER_TIMEOUT,
	});

	collector.on('collect', async (i: MessageComponentInteraction) => {
		await i.deferUpdate();
		let filterMenuVisible = false;
		let sortMenuVisible = false;

		if (i.isButton()) {
			const buttonInteraction = i;
			if (buttonInteraction.customId === 'filterIconButton_binder') {
				if (activeFilters && activeFilters.length > 0) {
					activeFilters = undefined;
				} else {
					filterMenuVisible = true;
				}
			} else if (buttonInteraction.customId === 'sortIconButton_binder') {
				if (activeSort) {
					activeSort = undefined;
				} else {
					sortMenuVisible = true;
				}
			} else if (buttonInteraction.customId === 'leftPage_button_id_binder') {
				currentPage = ((currentPage - 2 + totalPages) % totalPages) + 1;
			} else if (buttonInteraction.customId === 'rightPage_button_id_binder') {
				currentPage = (currentPage % totalPages) + 1;
			}
		}

		if (i.isStringSelectMenu()) {
			if (i.customId.endsWith('_filter_select_id_binder')) {
				activeFilters = i.values;
				currentPage = 1;
			}
			if (i.customId.endsWith('sort_select_id_binder')) {
				activeSort = i.values[0];
				currentPage = 1;
			}
		}

		await interaction.editReply(await binderBuilder(filterMenuVisible, sortMenuVisible));
	});

	collector.on('end', async () => {
		if (actionRow && actionRow.components.length > 0) {
			actionRow.components.forEach((component) => {
				component.setDisabled(true);
			});
			await interaction.editReply({ components: [actionRow] });
		} else {
			await interaction.editReply({ components: [] });
		}

		await interaction.followUp({
			content: 'Binder closed after a while the energy needed to keep it open was too big',
			ephemeral: true,
		});
	});
}

export { data, execute };
