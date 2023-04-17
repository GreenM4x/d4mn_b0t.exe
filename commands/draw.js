const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { writeDb } = require("../db/dbFunctions");

const timeout = new Set();
const CARDS_PER_PAGE = 4;
const MAX_PAGES = 4;
const MAX_CARDS = CARDS_PER_PAGE * MAX_PAGES;

module.exports = {
  data: new SlashCommandBuilder().setName("draw").setDescription("Draw a card every 15min"),
  async execute(interaction) {
    if (timeout.has(interaction.user.id)) {
      return await interaction.reply({
        content: `You are on a cooldown, try later!`,
        ephemeral: true,
      });
    }

    const data = require("../db/cardInfo.json");

    const card = data.data[Math.floor(Math.random() * data.data.length)];

    const cardInfo = {
      id: card.id,
      name: card.name,
      type: card.type,
      price: card.card_prices[0].cardmarket_price,
      img: card.card_images[0].image_url,
      rarity: card.card_sets[Math.floor(Math.random() * card.card_sets?.length)].set_rarity,
    };

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

    const embed = new EmbedBuilder()
      .setColor(getColorForCardType(cardInfo.type))
      .setTitle(cardInfo.name)
      .setImage(cardInfo.img)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { name: "Type", value: cardInfo.type, inline: true },
        { name: "Rarity", value: cardInfo.rarity, inline: true },
        { name: "Price", value: cardInfo.price, inline: true }
      )
      .setTimestamp(Date.now());

    await interaction.reply({
      embeds: [embed],
      components: [actionRow],
    });

    const filter = (i) => i.isButton() && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

    collector.on("collect", async (i) => {
      if (i.customId === "accept_button_id") {
        const dbdata = require("../db.json");
        const dbIndex = dbdata.findIndex((x) => x.userId === interaction.user.id);

        if (dbIndex === -1) {
          writeDb({
            userId: interaction.user.id,
            userCardId: [cardInfo.id],
            userCardRarity: [cardInfo.rarity],
          });
        } else {
          const userCardArray = dbdata[dbIndex].userCardId;

          if (userCardArray.length < MAX_CARDS) {
            userCardArray.push(cardInfo.id);
            dbdata[dbIndex].userCardRarity.push(cardInfo.rarity);
            writeDb(dbdata[dbIndex]);
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

    timeout.add(interaction.user.id);
    setTimeout(() => {
      timeout.delete(interaction.user.id);
    }, 900000);
  },
};

function getColorForCardType(type) {
  const typeColors = {
    Normal: 0xffff00, // Yellow
    Effect: 0xffa500, // Orange
    Ritual: 0xadd8e6, // Light blue
    Fusion: 0xee82ee, // Violet
    Synchro: 0xffffff, // White
    Xyz: 0x000000, // Black
    Pendulum: 0x008000, // Green
    Link: 0x00008b, // Dark blue
    Spell: 0x008000, // Green
    Trap: 0x800080, // Purple
    Token: 0x808080, // Gray
  };

  // Find the first color that matches a partial key in the typeColors object
  const color = Object.keys(typeColors).find((key) => type.includes(key));
  return typeColors[color] || 0xffff00; // Default color if type not found
}
