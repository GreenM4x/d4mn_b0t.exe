const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const { readDb } = require("../db/dbFunctions");

const CARDS_PER_PAGE = 4;
const BINDER_TIMEOUT = 60000;
const COMMAND_COOLDOWN = 16000;
const timeout = new Set();

const cardInfo = require("../db/cardInfo.json");

module.exports = {
  data: new SlashCommandBuilder().setName("binder").setDescription("Show the cards you collected"),
  async execute(interaction) {
    if (timeout.has(interaction.user.id)) {
      return await interaction.reply({
        content: "You are on a cooldown, try again later",
        ephemeral: true,
      });
    }

    const binder = readDb();
    const dbIndex = binder.findIndex((x) => x.userId === interaction.user.id);

    if (dbIndex < 0) {
      return await interaction.reply({
        content: "You don't have any cards. Try the /draw command first",
        ephemeral: true,
      });
    }

    const { userCardId, userCardRarity } = binder[dbIndex];
    const userName = interaction.user.username;
    const userAvatar = interaction.user.displayAvatarURL();

    const cardData = userCardId.map((cardId) => {
      const card = cardInfo.data.find((card) => card.id === cardId);
      const price = card.card_prices[0].cardmarket_price;
      return {
        id: cardId,
        name: card.name,
        price: price,
        rarity: userCardRarity[userCardId.indexOf(cardId)],
      };
    });

    const leftPage = new ButtonBuilder()
      .setCustomId("leftPage_button_id")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("◀️");

    const rightPage = new ButtonBuilder()
      .setCustomId("rightPage_button_id")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("▶️");

    let currentPage = 1;

    async function binderBuilder() {
      const totalPages = Math.ceil(cardData.length / CARDS_PER_PAGE);
      const startIndex = (currentPage - 1) * CARDS_PER_PAGE;
      const endIndex = startIndex + CARDS_PER_PAGE;
      const cardsOnPage = cardData.slice(startIndex, endIndex);

      const embed = new EmbedBuilder()
        .setTitle(`${userName}'s Binder \t Page [ ${currentPage} ]`)
        .setThumbnail(userAvatar)
        .setTimestamp(Date.now())
        .setURL("https://example.org/");
      const imageEmbeds = [];
      const attachments = [];
      cardsOnPage.forEach((card, index) => {
        embed.addFields(
          { name: `[${startIndex + index + 1}] Name`, value: card.name, inline: true },
          { name: "Rarity", value: card.rarity, inline: true },
          { name: "Price", value: card.price, inline: true }
        );
        attachments.push(
          new AttachmentBuilder(`./db/images/${card.id}.jpg`, { name: `${card.id}.jpg` })
        );
        imageEmbeds.push(
          new EmbedBuilder().setImage(`attachment://${card.id}.jpg`).setURL("https://example.org/")
        );
      });

      const embeds = [embed, ...imageEmbeds];

      const actionRow = new ActionRowBuilder();
      if (currentPage > 1) {
        actionRow.addComponents(leftPage);
      }

      if (currentPage < totalPages) {
        actionRow.addComponents(rightPage);
      }
      if (!actionRow.components.length) {
        return { embeds, files: attachments };
      }
      return { embeds, components: [actionRow], files: attachments };
    }

    await interaction.reply(await binderBuilder());

    const filter = (i) => i.isButton() && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: BINDER_TIMEOUT,
    });

    collector.on("collect", async (i) => {
      await i.deferUpdate();
      if (i.customId === "leftPage_button_id") {
        currentPage--;
      } else if (i.customId === "rightPage_button_id") {
        currentPage++;
      }

      await interaction.editReply(await binderBuilder());
    });

    collector.on("end", async () => {
      timeout.add(interaction.user.id);
      await interaction.followUp({
        content: "Binder closed after a while the energy needed to keep it open was too big",
        ephemeral: true,
      });
      setTimeout(() => timeout.delete(interaction.user.id), COMMAND_COOLDOWN);
    });
  },
};
