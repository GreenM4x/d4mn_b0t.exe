import {
	SlashCommandBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	AttachmentBuilder,
	StringSelectMenuBuilder,
	ChatInputCommandInteraction,
	ButtonInteraction,
	StringSelectMenuInteraction,
	MessageActionRowComponentBuilder,
	CollectorFilter,
	MessageComponentInteraction,
} from 'discord.js';
import seedrandom from 'seedrandom';
import { getUserData, writeDb } from '../db/dbFunctions.js';
import { createEmbed } from '../shared/utils.js';
import boosterPacksData from '../db/booster_packs/data.json' assert { type: 'json' };
import { MAX_PURCHASES_PER_PACK_PER_DAY, MAX_BOOSTERS_IN_SHOP } from '../shared/variables.js';
import { openBoosterPack } from '../shared/booster-pack.js';
import path from 'path';
import { promises as fs } from 'fs';
import { type BoosterPack } from '../shared/models/boosterpack.models.js';
import { type Binder } from '../shared/models/binder.models.js';

const __dirname = import.meta.dirname;

const data = new SlashCommandBuilder().setName('shop').setDescription('Buy and open booster packs');

async function execute(interaction: ChatInputCommandInteraction) {
	const boosterPacks = boosterPacksData.map(
		(packData): BoosterPack => ({
			id: packData.code,
			name: packData.name,
			price: packData.price,
			description:
				'A booster pack containing random cards. \n Five new booster packs are available every day.',
			image: `${packData.code.split('-')[0]}.png`,
			cards: packData.cards,
		}),
	);

	const filteredBoosterPacks: BoosterPack[] = [];
	for (const pack of boosterPacks) {
		const imagePath = path.join(__dirname, '..', 'db', 'booster_packs', 'images', pack.image);
		try {
			await fs.access(imagePath);
			filteredBoosterPacks.push(pack);
		} catch (error) {
			console.log(`Image not found for pack: ${pack.name}`);
		}
	}

	const dailyBoosterPacks = generateDailyBoosterPacks(filteredBoosterPacks);
	let currentPage = 0;

	const binder = getUserData(interaction.user.id);
	const userCurrency = binder ? binder.currency : 0;

	const displayShopEmbed = () => {
		const pack = dailyBoosterPacks[currentPage]!;
		const embed = createEmbed({
			title: pack.name,
			description: pack.description,
			color: 0x000000,
			fields: [
				{ name: 'Price', value: `${pack.price}€`, inline: true },
				{ name: 'Your Balance', value: `${userCurrency.toFixed(2)}€`, inline: true },
				{
					name: 'Purchases Today',
					value: `${
						binder.dailyPurchases.packs[pack.id] || 0
					} / ${MAX_PURCHASES_PER_PACK_PER_DAY}`,
					inline: false,
				},
			],
			imageUrl: `attachment://${pack.image}`,
			footer: {
				text: `Page ${currentPage + 1} / ${dailyBoosterPacks.length}`,
			},
		});
		return embed;
	};

	const createSelectMenu = (selectedValue: BoosterPack) => {
		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId('select_menu_id_shop')
			.setPlaceholder('Choose a booster pack');

		dailyBoosterPacks.forEach((pack) => {
			selectMenu.addOptions({
				label: pack.name,
				value: pack.id,
				default: pack.id === selectedValue.id,
			});
		});

		return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
	};

	const selectRow = createSelectMenu(dailyBoosterPacks[currentPage]!);

	const prevButton = new ButtonBuilder()
		.setCustomId('prev_button_id_shop')
		.setEmoji('◀️')
		.setStyle(ButtonStyle.Secondary);

	const buyButton = new ButtonBuilder()
		.setCustomId('buy_button_id_shop')
		.setLabel('BUY')
		.setStyle(ButtonStyle.Success)
		.setEmoji('💰');

	const nextButton = new ButtonBuilder()
		.setCustomId('next_button_id_shop')
		.setEmoji('▶️')
		.setStyle(ButtonStyle.Secondary);

	const buyRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
		prevButton,
		buyButton,
		nextButton,
	);

	await interaction.reply({
		embeds: [displayShopEmbed()],
		components: [selectRow, buyRow],
		files: [
			new AttachmentBuilder(
				`./db/booster_packs/images/${dailyBoosterPacks[currentPage]!.image}`,
				{
					name: dailyBoosterPacks[currentPage]!.image,
				},
			),
		],
	});

	const filter: CollectorFilter<[MessageComponentInteraction]> = (i) =>
		(i.isButton() || i.isStringSelectMenu()) &&
		i.user.id === interaction.user.id &&
		i.customId.includes('id_shop');
	const collector = interaction.channel!.createMessageComponentCollector({
		filter,
		time: 60000,
	});

	collector.on('collect', async (i: StringSelectMenuInteraction | ButtonInteraction) => {
		if (i.isButton()) {
			if (i.customId === 'prev_button_id_shop') {
				currentPage = currentPage > 0 ? currentPage - 1 : dailyBoosterPacks.length - 1;
			} else if (i.customId === 'next_button_id_shop') {
				currentPage = (currentPage + 1) % dailyBoosterPacks.length;
			} else if (i.customId === 'buy_button_id_shop') {
				await handleBuyButton(i, binder, dailyBoosterPacks[currentPage]!);
				collector.stop();
				return;
			}
		} else if (i.isStringSelectMenu()) {
			const selectedPackId = i.values[0];
			currentPage = dailyBoosterPacks.findIndex((pack) => pack.id === selectedPackId);
		}

		const pack = dailyBoosterPacks[currentPage]!;
		await i.update({
			embeds: [displayShopEmbed()],
			components: [createSelectMenu(dailyBoosterPacks[currentPage]!), buyRow],
			files: [
				new AttachmentBuilder(`./db/booster_packs/images/${pack.image}`, {
					name: pack.image,
				}),
			],
		});
	});

	collector.on('end', async () => {
		await interaction.editReply({
			components: [],
		});
	});
}

const generateDailyBoosterPacks = (boosterPacks: BoosterPack[]): BoosterPack[] => {
	const today = new Date();
	const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
	const rng = seedrandom(seed.toString());

	const randomBoosterPacks = boosterPacks
		.map((pack) => ({ ...pack, random: rng() }))
		.sort((a, b) => a.random - b.random)
		.slice(0, MAX_BOOSTERS_IN_SHOP);

	return randomBoosterPacks;
};

async function handleBuyButton(i: ButtonInteraction, binder: Binder, pack: BoosterPack) {
	if (binder.currency < pack.price) {
		await i.reply({
			content: "You don't have enough money to buy this pack.",
			ephemeral: true,
		});
		return;
	}

	if (binder.dailyPurchases.packs[pack.id]! >= MAX_PURCHASES_PER_PACK_PER_DAY) {
		await i.reply({
			content: 'You have already bought this booster pack today.',
			ephemeral: true,
		});
		return;
	}

	await i.reply({
		content: `You bought ${pack.name} for ${pack.price}€.`,
		ephemeral: true,
	});
	binder.currency -= pack.price;
	binder.dailyPurchases.packs[pack.id] = (binder.dailyPurchases.packs[pack.id] || 0) + 1;
	writeDb(binder);
	await openBoosterPack(i, binder, pack);
}

export { data, execute };
