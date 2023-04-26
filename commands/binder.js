const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const { getUserData } = require("../db/dbFunctions");
const { CARDS_PER_PAGE, BINDER_TIMEOUT, BINDER_COMMAND_COOLDOWN } = require("../shared/variables");
const { getCardData } = require("../shared/card");
const cooldownManager = require("../shared/cooldownManager");
const { createFilterMenu, filterCards } = require("../shared/utils");

const COMMAND_NAME = "binder";
const SOME_RANDOM_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

module.exports = {
  data: new SlashCommandBuilder()
    .setName(COMMAND_NAME)
    .setDescription("Show the cards you collected"),
  async execute(interaction) {
    if (cooldownManager.check(interaction.user.id, COMMAND_NAME)) {
      return await interaction.reply({
        content: `You are on a cooldown. ${cooldownManager.remainingCooldown(
          interaction.user.id,
          COMMAND_NAME
        )} remaining`,
        ephemeral: true,
      });
    }
    cooldownManager.add(interaction.user.id, COMMAND_NAME, BINDER_COMMAND_COOLDOWN);

    const binder = await getUserData(interaction.user.id);
    const userName = interaction.user.username;
    const userAvatar = interaction.user.displayAvatarURL();

    if (!binder || binder.cards.length === 0) {
      return await interaction.reply({
        content: "You don't have any cards. Try the /draw command first",
        ephemeral: true,
      });
    }
    const cardData = binder.cards.map((card) => getCardData(card));

    const leftPage = new ButtonBuilder()
      .setCustomId("leftPage_button_id_binder")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("◀️");

    const rightPage = new ButtonBuilder()
      .setCustomId("rightPage_button_id_binder")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("▶️");

    let currentPage = 1;
    let actionRow;
    let binderFilter;
    async function binderBuilder() {
      const filteredCardData = filterCards(cardData, binderFilter);
      const totalPages = Math.ceil(filteredCardData.length / CARDS_PER_PAGE);
      const startIndex = (currentPage - 1) * CARDS_PER_PAGE;
      const endIndex = startIndex + CARDS_PER_PAGE;
      const cardsOnPage = filteredCardData.slice(startIndex, endIndex);

      const typeRarityFilterMenu = createFilterMenu(cardData, binderFilter);
      const filterMenu = new ActionRowBuilder().addComponents(typeRarityFilterMenu);

      const embed = new EmbedBuilder()
        .setTitle(`${userName}'s Binder \t Page ${currentPage} / ${totalPages ? totalPages : 1}`)
        .setThumbnail(userAvatar)
        .setTimestamp(Date.now())
        .setURL(SOME_RANDOM_URL);
      const imageEmbeds = [];
      const attachments = [];
      cardsOnPage.forEach((card, index) => {
        embed.addFields(
          { name: `[${startIndex + index + 1}] Name`, value: card.name, inline: true },
          { name: "Rarity", value: card.rarity, inline: true },
          { name: "Price", value: `${card.price}€`, inline: true }
        );
        attachments.push(
          new AttachmentBuilder(`./db/images/${card.id}.jpg`, { name: `${card.id}.jpg` })
        );
        imageEmbeds.push(
          new EmbedBuilder().setImage(`attachment://${card.id}.jpg`).setURL(SOME_RANDOM_URL)
        );
      });

      if (binderFilter?.length && cardsOnPage?.length) {
        embed.setDescription(
          `Filter: ${binderFilter?.map((filter) => filter.split("_")[1]).join(", ")}`
        );
      }
      if (!cardsOnPage.length) {
        embed.setDescription("No cards found");
      }

      const embeds = [embed, ...imageEmbeds];

      actionRow = new ActionRowBuilder();
      if (currentPage > 1) {
        actionRow.addComponents(leftPage);
      }

      if (currentPage < totalPages) {
        actionRow.addComponents(rightPage);
      }
      if (!actionRow.components.length) {
        return {
          embeds,
          files: attachments,
          components: [filterMenu],
        };
      }
      return {
        embeds,
        components: [filterMenu, actionRow],
        files: attachments,
      };
    }

    await interaction.reply(await binderBuilder());

    const filter = (i) =>
      i.user.id === interaction.user.id &&
      (i.customId.includes("Page_button_id_binder") || i.customId.includes("_filter_select_id"));
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: BINDER_TIMEOUT,
    });

    collector.on("collect", async (i) => {
      await i.deferUpdate();
      if (i.isStringSelectMenu()) {
        if (i.customId.endsWith("_filter_select_id_binder")) {
          binderFilter = i.values;
          currentPage = 1;
        }
      } else if (i.isButton()) {
        if (i.customId === "leftPage_button_id_binder") {
          currentPage--;
        } else if (i.customId === "rightPage_button_id_binder") {
          currentPage++;
        }
      }

      await interaction.editReply(await binderBuilder());
    });

    collector.on("end", async () => {
      actionRow?.components?.forEach((component) => {
        component.setDisabled(true);
      });
      await interaction.editReply({ components: [actionRow] });
      await interaction.followUp({
        content: "Binder closed after a while the energy needed to keep it open was too big",
        ephemeral: true,
      });
    });
  },
};
