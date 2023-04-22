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

const COMMAND_NAME = "binder";

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

    if (!binder) {
      return await interaction.reply({
        content: "You don't have any cards. Try the /draw command first",
        ephemeral: true,
      });
    }
    const cardData = binder.cards.map((card) => getCardData(card));

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
        .setTitle(`${userName}'s Binder \t Page ${currentPage} / ${totalPages}`)
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
      await interaction.followUp({
        content: "Binder closed after a while the energy needed to keep it open was too big",
        ephemeral: true,
      });
    });
  },
};
