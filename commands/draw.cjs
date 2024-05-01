const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require("discord.js");
const { writeDb, getUserData } = require("../db/dbFunctions.cjs");
const { getColorForCardType, getRandomCard } = require("../shared/card.cjs");
const { DRAW_COMMAND_COOLDOWN, DRAW_TIMEOUT } = require("../shared/variables.cjs");
const cooldownManager = require("../shared/cooldownManager.cjs");
const { createEmbed } = require("../shared/utils.cjs");

const COMMAND_NAME = "draw";
module.exports = {
  data: new SlashCommandBuilder().setName(COMMAND_NAME).setDescription("Draw a card every 15min"),
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
    cooldownManager.add(interaction.user.id, COMMAND_NAME, DRAW_COMMAND_COOLDOWN);
    const card = getRandomCard();

    const accept = new ButtonBuilder()
      .setCustomId("accept_button_id_draw")
      .setLabel("Place in Binder")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("❤️");

    const sell = new ButtonBuilder()
      .setCustomId("sell_button_id_draw")
      .setLabel("Sell")
      .setStyle(ButtonStyle.Success)
      .setEmoji("💰");

    const actionRow = new ActionRowBuilder().addComponents(accept, sell);

    const embed = createEmbed({
      title: card.name,
      color: getColorForCardType(card.type),
      thumbnail: interaction.user.displayAvatarURL(),
      fields: [
        { name: "Type", value: card.type, inline: true },
        { name: "Rarity", value: card.rarity, inline: true },
        { name: "Price", value: `${card.price}€`, inline: true },
      ],
      timestamp: Date.now(),
      imageUrl: card.img,
    });

    await interaction.reply({
      embeds: [embed],
      components: [actionRow],
      files: [new AttachmentBuilder(`./db/images/${card.id}.jpg`, { name: `${card.id}.jpg` })],
    });

    const filter = (i) =>
      i.isButton() && i.user.id === interaction.user.id && i.customId.includes("_id_draw");
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: DRAW_TIMEOUT,
    });

    collector.on("collect", async (i) => {
      const binder = getUserData(interaction.user.id);
      if (i.customId === "accept_button_id_draw") {
        if (!binder || binder.cards.length === 0) {
          writeDb({
            userId: interaction.user.id,
            cards: [{ id: card.id, rarity: card.rarity }],
            stats: { cardsAddedToBinder: 1, cardsDiscarded: 0, cardsGifted: 0, cardsSold: 0 },
            currency: 0,
          });
        } else {
          const userCards = binder.cards;
          userCards.push({
            id: card.id,
            rarity: card.rarity,
          });
          binder.stats.cardsAddedToBinder++;
          writeDb(binder);
        }
        embed.setColor(0x00ff00); // Green color
        await i.update({ embeds: [embed], components: [] });
        await i.followUp({
          content: "The card was sleeved and carefully put in your Binder!",
          ephemeral: true,
        });
      } else if (i.customId === "sell_button_id_draw") {
        embed.setColor(0xff0000); // Red color
        if (!binder || binder.cards.length === 0) {
          writeDb({
            userId: interaction.user.id,
            cards: [],
            stats: { cardsAddedToBinder: 0, cardsDiscarded: 0, cardsGifted: 0, cardsSold: 1 },
            currency: 0,
          });
        } else {
          binder.stats.cardsSold++;
          binder.currency += parseFloat(card.price);
          writeDb(binder);
        }
        await i.update({ embeds: [embed], components: [] });
        await i.followUp({
          content: `You sold the card for ${card.price}€ to next best duellist on the street!`,
          ephemeral: true,
        });
      }
    });

    collector.on("end", async (collected) => {
      await interaction.editReply({
        embeds: [embed],
        components: [],
      });
      if (collected.size <= 0) {
        await interaction.followUp({
          content: "You waited too long, the card disappeared into the shadow realm!",
          ephemeral: true,
        });
      }
    });
  },
};
