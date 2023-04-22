const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require("discord.js");
const { writeDb, getUserData } = require("../db/dbFunctions");
const { getColorForCardType, getRandomCard } = require("../shared/card");
const {
  CARDS_PER_PAGE,
  MAX_PAGES,
  DRAW_COMMAND_COOLDOWN,
  DRAW_TIMEOUT,
} = require("../shared/variables");
const cooldownManager = require("../shared/cooldownManager");
const { createEmbed } = require("../shared/utils");
const MAX_CARDS = CARDS_PER_PAGE * MAX_PAGES;

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
      .setCustomId("accept_button_id")
      .setLabel("Place in Binder")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("❤️");

    const denial = new ButtonBuilder()
      .setCustomId("denial_button_id")
      .setLabel("Burn It")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔥");

    const actionRow = new ActionRowBuilder().addComponents(accept, denial);

    const embed = createEmbed({
      title: card.name,
      color: getColorForCardType(card.type),
      thumbnail: interaction.user.displayAvatarURL(),
      fields: [
        { name: "Type", value: card.type, inline: true },
        { name: "Rarity", value: card.rarity, inline: true },
        { name: "Price", value: card.price, inline: true },
      ],
      timestamp: Date.now(),
      imageUrl: card.img,
    });

    await interaction.reply({
      embeds: [embed],
      components: [actionRow],
      files: [new AttachmentBuilder(`./db/images/${card.id}.jpg`, { name: `${card.id}.jpg` })],
    });

    const filter = (i) => i.isButton() && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: DRAW_TIMEOUT,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "accept_button_id") {
        const binder = getUserData(interaction.user.id);

        if (!binder) {
          writeDb({
            userId: interaction.user.id,
            userCardId: [card.id],
            userCardRarity: [card.rarity],
          });
        } else {
          const userCardArray = binder.userCardId;

          if (userCardArray.length < MAX_CARDS) {
            userCardArray.push(card.id);
            binder.userCardRarity.push(card.rarity);
            writeDb(binder);
          } else {
            return await i.followUp({
              content: `Your Binder is full, delete a card first with the /delete command.`,
              ephemeral: true,
            });
          }
        }
        embed.setColor(0x00ff00); // Green color
        await i.update({ embeds: [embed], components: [] });
        await i.followUp({
          content: "The card was sleeved and carefully put in your Binder!",
          ephemeral: true,
        });
      } else if (i.customId === "denial_button_id") {
        embed.setColor(0xff0000); // Red color
        await i.update({ embeds: [embed], components: [] });
        await i.followUp({
          content: "The Card was burned and floats now in the shadow realm!",
          ephemeral: true,
        });
      }
    });

    collector.on("end", async (collected) => {
      console.log(`Collected ${collected.size} items`);

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
