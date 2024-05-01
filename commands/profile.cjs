const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { getUserData } = require("../db/dbFunctions.cjs");
const { calculateBinderValue } = require("../shared/utils.cjs");

const COMMAND_NAME = "profile";

module.exports = {
  data: new SlashCommandBuilder()
    .setName(COMMAND_NAME)
    .setDescription("Show your profile with various statistics"),
  async execute(interaction) {
    const user = interaction.user;
    const binder = await getUserData(user.id);

    if (!binder || binder.cards.length === 0) {
      return await interaction.reply({
        content: "You don't have any cards. Try the /draw command first",
        ephemeral: true,
      });
    }

    // Calculate statistics
    const numCards = binder.cards.length;
    const binderValue = calculateBinderValue(binder.cards);

    // Create and send the embed
    const embed = new EmbedBuilder()
      .setTitle(`${user.username}'s Profile`)
      .setThumbnail(user.displayAvatarURL())
      .setColor("#0099ff")
      .addFields(
        { name: "Balance", value: `${binder.currency.toFixed(2)}€`, inline: true },
        { name: "Total Cards", value: numCards.toString(), inline: true },
        { name: "Binder Value", value: `${binderValue.toFixed(2)}€`, inline: true },
        {
          name: " ",
          value: " ",
          inline: false,
        },
        {
          name: "Cards Added to Binder",
          value: binder.stats.cardsAddedToBinder.toString(),
          inline: true,
        },
        { name: "Cards Discarded", value: binder.stats.cardsDiscarded.toString(), inline: true },
        { name: "Cards Gifted", value: binder.stats.cardsGifted.toString(), inline: true },
        { name: "Cards Sold", value: binder.stats.cardsSold.toString(), inline: false }
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};
