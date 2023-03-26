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
        .setDescription(
          " Position of the card in your binder, you want to delete"
        )
        .setRequired(true)
    ),
  async execute(interaction) {
    var binder = readDb();
    var dbIndex;

    dbIndex = binder.findIndex((x) => x.userId === interaction.user.id);
    if (dbIndex < 0)
      return await interaction.reply({
        content: `You don't have any cards. Try the /draw command first`,
        ephemeral: true,
      });

    const cardDelId = interaction.options.getString("id");
    if (cardDelId <= 0 || cardDelId > 8 || isNaN(cardDelId))
      return await interaction.reply({
        content: "Please enter a valid Id",
        ephemeral: true,
      });

    var userCardArray = binder[dbIndex].userCardId;

    var userCardRarityArray = binder[dbIndex].userCardRarity;

    console.log(
      userCardArray[cardDelId - 1] + "   " + userCardRarityArray[cardDelId - 1]
    );

    var index = binder[dbIndex].userCardId.indexOf(
      userCardArray[cardDelId - 1]
    );
    if (index !== -1) {
      binder[dbIndex].userCardId.splice(index, 1);
    }

    var index2 = binder[dbIndex].userCardRarity.indexOf(
      userCardRarityArray[cardDelId - 1]
    );
    if (index2 !== -1) {
      binder[dbIndex].userCardRarity.splice(index, 1);
    }

    console.log(binder);

    fs.writeFile("db.json", JSON.stringify(binder), (err) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log("Data saved successfully");
    });

    await interaction.reply({ content: "DEL", ephemeral: true });
  },
};
