const { SlashCommandBuilder } = require("discord.js");
const { readDb } = require("../db/dbFunctions");
const fs = require("fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("delete")
    .setDescription("Send a card from your Binder into the Shadow Realm!")
    .addStringOption((option) =>
      option
        .setName("id")
        .setDescription(" Position of the card in your binder, you want to delete")
        .setRequired(true)
    ),
  async execute(interaction) {
    const allData = readDb();
    const binder = allData.find((data) => data.userId === interaction.user.id);

    if (!binder || binder.cards.length === 0) {
      return await interaction.reply({
        content: `You don't have any cards. Try the /draw command first`,
        ephemeral: true,
      });
    }

    const cardDelIndex = interaction.options.getString("id");

    let userCards = binder.cards;
    if (cardDelIndex <= 0 || cardDelIndex > userCards.length || isNaN(cardDelIndex)) {
      return await interaction.reply({
        content: "Please enter a valid Id",
        ephemeral: true,
      });
    }

    userCards.splice(cardDelIndex - 1, 1);
    binder.cards = userCards;
    allData[allData.findIndex((data) => data.userId === interaction.user.id)] = binder;

    fs.writeFile("db.json", JSON.stringify(allData), (err) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log("Data saved successfully");
    });

    await interaction.reply({
      content: "Your card was deleted!",
      ephemeral: true,
    });
  },
};
