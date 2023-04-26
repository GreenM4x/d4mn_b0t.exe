const fs = require("fs");
const path = require("path");
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const seedrandom = require("seedrandom");
const { getUserData, writeDb } = require("../db/dbFunctions");
const { createEmbed } = require("../shared/utils");
const boosterPacksData = require("../db/booster_packs/data.json");
const { MAX_PURCHASES_PER_PACK_PER_DAY } = require("../shared/variables");
const { openBoosterPack } = require("../shared/booster-pack");

module.exports = {
  data: new SlashCommandBuilder().setName("shop").setDescription("Buy and open booster packs"),
  async execute(interaction) {
    const boosterPacks = boosterPacksData
      .map((packData) => ({
        id: packData.code,
        name: packData.name,
        price: packData.price,
        description: "A booster pack containing random cards.",
        image: `${packData.code.split("-")[0]}.png`,
        cards: packData.cards,
      }))
      .filter((pack) =>
        fs.existsSync(path.join(__dirname, "..", "db", "booster_packs", "images", pack.image))
      );

    const dailyBoosterPacks = generateDailyBoosterPacks(boosterPacks);

    let currentPage = 0;

    const binder = getUserData(interaction.user.id);
    const userCurrency = binder ? binder.currency : 0;

    const displayShopEmbed = () => {
      const pack = dailyBoosterPacks[currentPage];
      const embed = createEmbed({
        title: pack.name,
        description: pack.description,
        color: 0x000000,
        fields: [
          { name: "Price", value: `$${pack.price}€`, inline: true },
          { name: "Your Balance", value: `${userCurrency.toFixed(2)}€`, inline: true },
          {
            name: "Purchases Today",
            value: `${
              binder.dailyPurchases.packs[pack.id] || 0
            } / ${MAX_PURCHASES_PER_PACK_PER_DAY}`,
            inline: false,
          },
        ],
        imageUrl: `attachment://${pack.image}`,
      });
      return embed;
    };

    const createSelectMenu = (selectedValue) => {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("select_menu_id_shop")
        .setPlaceholder("Choose a booster pack");

      dailyBoosterPacks.forEach((pack) => {
        selectMenu.addOptions({
          label: pack.name,
          value: pack.id,
          default: pack.id === selectedValue.id,
        });
      });

      return new ActionRowBuilder().addComponents(selectMenu);
    };

    const selectRow = createSelectMenu(dailyBoosterPacks[currentPage]);

    const prevButton = new ButtonBuilder()
      .setCustomId("prev_button_id_shop")
      .setEmoji("◀️")
      .setStyle(ButtonStyle.Secondary);

    const buyButton = new ButtonBuilder()
      .setCustomId("buy_button_id_shop")
      .setLabel("BUY")
      .setStyle(ButtonStyle.Success)
      .setEmoji("💰");

    const nextButton = new ButtonBuilder()
      .setCustomId("next_button_id_shop")
      .setEmoji("▶️")
      .setStyle(ButtonStyle.Secondary);

    const buyRow = new ActionRowBuilder().addComponents(prevButton, buyButton, nextButton);

    await interaction.reply({
      embeds: [displayShopEmbed()],
      components: [selectRow, buyRow],
      files: [
        new AttachmentBuilder("./db/booster_packs/images/" + dailyBoosterPacks[currentPage].image, {
          name: dailyBoosterPacks[currentPage].image,
        }),
      ],
    });

    const filter = (i) =>
      (i.isButton() || i.isStringSelectMenu()) &&
      i.user.id === interaction.user.id &&
      i.customId.includes("id_shop");
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "prev_button_id_shop") {
        currentPage = currentPage > 0 ? currentPage - 1 : dailyBoosterPacks.length - 1;
      } else if (i.customId === "next_button_id_shop") {
        currentPage = (currentPage + 1) % dailyBoosterPacks.length;
      } else if (i.customId === "select_menu_id_shop") {
        const selectedPackId = i.values[0];
        currentPage = dailyBoosterPacks.findIndex((pack) => pack.id === selectedPackId);
      }

      const pack = dailyBoosterPacks[currentPage];
      if (i.customId === "buy_button_id_shop") {
        if (userCurrency < pack.price) {
          await i.reply({
            content: "You don't have enough money to buy this pack.",
            ephemeral: true,
          });
          return;
        }

        if (binder.dailyPurchases.packs[pack.id] >= MAX_PURCHASES_PER_PACK_PER_DAY) {
          await i.reply({
            content: "You have already bought this booster pack today.",
            ephemeral: true,
          });
          return;
        }

        await interaction.followUp({
          content: `You bought ${pack.name} for ${pack.price}€.`,
          ephemeral: true,
        });
        binder.currency -= pack.price;
        binder.dailyPurchases.packs[pack.id] = (binder.dailyPurchases.packs[pack.id] || 0) + 1;
        writeDb(binder);
        await openBoosterPack(interaction, binder, pack);
      }

      if (i.customId === "buy_button_id_shop") {
        collector.stop();
      } else {
        await i.update({
          embeds: [displayShopEmbed()],
          components: [createSelectMenu(dailyBoosterPacks[currentPage]), buyRow],
          files: [
            new AttachmentBuilder("./db/booster_packs/images/" + pack.image, { name: pack.image }),
          ],
        });
      }
    });

    collector.on("end", async (collected) => {
      await interaction.editReply({
        components: [],
      });
    });
  },
};

const generateDailyBoosterPacks = (boosterPacks) => {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const rng = seedrandom(seed);

  const randomBoosterPacks = boosterPacks
    .map((pack) => ({ ...pack, random: rng() }))
    .sort((a, b) => a.random - b.random)
    .slice(0, 5);

  return randomBoosterPacks;
};
