const {
  SlashCommandBuilder,
  Client,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
} = require("discord.js");
const { readDb } = require("../db/dbFunctions");

var timeout = [];

module.exports = {
  data: new SlashCommandBuilder().setName("binder").setDescription("Show the cards you collected"),
  async execute(interaction) {
    var binder = readDb();
    var dbIndex;

    dbIndex = binder.findIndex((x) => x.userId === interaction.user.id);
    if (dbIndex < 0)
      return await interaction.reply({
        content: `You don't have any cards. Try the /draw command first`,
        ephemeral: true,
      });

    if (timeout.includes(interaction.user.id))
      return await interaction.reply({
        content: `You are on a cooldown, try again later`,
        ephemeral: true,
      });
    var userName = interaction.user.username;
    var userAvatar = interaction.user.displayAvatarURL();

    var pageChanged = false;

    const userCardArray = binder[dbIndex].userCardId;

    var userCardRarityArray = binder[dbIndex].userCardRarity;

    var userCardNameArray = [];
    var userCardPriceArray = [];
    var userCardImgArray = [];

    await fetch("https://db.ygoprodeck.com/api/v7/cardinfo.php")
      .then((res) => res.json())
      .then((data) => {
        userCardArray.forEach((cardid) => {
          var cardName = data.data[cardid].name;
          userCardNameArray.push(cardName);

          var cardPrice = data.data[cardid].card_prices[0].cardmarket_price;
          userCardPriceArray.push(cardPrice);

          var cardImg = data.data[cardid].card_images[0].image_url;
          userCardImgArray.push(cardImg);
        });
      });

    const leftPage = new ButtonBuilder()
      .setCustomId("leftPage_button_id")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("◀️");

    const rightPage = new ButtonBuilder()
      .setCustomId("rightPage_button_id")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("▶️");

    const actionRowLeft = new ActionRowBuilder().addComponents(leftPage);
    const actionRowRight = new ActionRowBuilder().addComponents(rightPage);

    var arraySize = userCardArray.length;
    var onPage = 1;
    var arrayIndex = 0;

    var embedNumer;

    await binderBuilder();

    async function binderBuilder(i) {
      if (arraySize > 4) {
        if (onPage == 1) {
          embedNumer = 4;
          arrayIndex = 0;
        } else if (onPage == 2) {
          embedNumer = arraySize - 4;
          arrayIndex = 4;
        }
      } else {
        embedNumer = arraySize;
      }

      switch (embedNumer) {
        case 1:
          const binder1 = new EmbedBuilder()
            .setImage(userCardImgArray[arrayIndex])
            .setTitle(userName + `'s Binder \t Page [ ` + onPage + ` ]`)
            .setThumbnail(userAvatar)
            .addFields(
              {
                name: "[" + (arrayIndex + 1).toString() + "]   Name",
                value: userCardNameArray[arrayIndex],
                inline: true,
              },
              {
                name: "Rarity",
                value: userCardRarityArray[arrayIndex],
                inline: true,
              },
              {
                name: "Price",
                value: userCardPriceArray[arrayIndex],
                inline: true,
              }
            )
            .setTimestamp(Date.now());

          if (arraySize <= 4) {
            await interaction.reply({
              embeds: [binder1],
            });
          } else if (onPage == 1 && pageChanged == false) {
            await interaction.reply({
              embeds: [binder1],
              components: [actionRowRight],
            });
          } else if (onPage == 2) {
            await i.editReply({
              embeds: [binder1],
              components: [actionRowLeft],
            });
          } else if (onPage == 1 && pageChanged == true) {
            await i.editReply({
              embeds: [binder1],
              components: [actionRowRight],
            });
          }

          break;
        case 2:
          var embeds = [
            new EmbedBuilder()
              .setURL("https://example.org/")
              .setImage(userCardImgArray[arrayIndex])
              .setTitle(userName + `'s Binder \t Page [ ` + onPage + ` ]`)
              .setThumbnail(userAvatar)
              .addFields(
                {
                  name: "[" + (arrayIndex + 1).toString() + "]   Name",
                  value: userCardNameArray[arrayIndex],
                  inline: true,
                },
                {
                  name: "Rarity",
                  value: userCardRarityArray[arrayIndex],
                  inline: true,
                },
                {
                  name: "Price",
                  value: userCardPriceArray[arrayIndex],
                  inline: true,
                },

                {
                  name: "[" + (arrayIndex + 2).toString() + "]   Name",
                  value: userCardNameArray[arrayIndex + 1],
                  inline: true,
                },
                {
                  name: "Rarity",
                  value: userCardRarityArray[arrayIndex + 1],
                  inline: true,
                },
                {
                  name: "Price",
                  value: userCardPriceArray[arrayIndex + 1],
                  inline: true,
                }
              )
              .setTimestamp(Date.now()),

            new EmbedBuilder()
              .setURL("https://example.org/")
              .setImage(userCardImgArray[arrayIndex + 1]),
          ];

          if (arraySize <= 4) {
            await interaction.reply({
              embeds,
            });
          } else if (onPage == 1 && pageChanged == false) {
            await interaction.reply({
              embeds,
              components: [actionRowRight],
            });
          } else if (onPage == 2) {
            await i.editReply({ embeds, components: [actionRowLeft] });
          } else if (onPage == 1 && pageChanged == true) {
            await i.editReply({ embeds, components: [actionRowRight] });
          }

          break;
        case 3:
          var embeds = [
            new EmbedBuilder()
              .setURL("https://example.org/")
              .setImage(userCardImgArray[arrayIndex])
              .setTitle(userName + `'s Binder \t Page [ ` + onPage + ` ]`)
              .setThumbnail(userAvatar)
              .addFields(
                {
                  name: "[" + (arrayIndex + 1).toString() + "]   Name",
                  value: userCardNameArray[arrayIndex],
                  inline: true,
                },
                {
                  name: "Rarity",
                  value: userCardRarityArray[arrayIndex],
                  inline: true,
                },
                {
                  name: "Price",
                  value: userCardPriceArray[arrayIndex],
                  inline: true,
                },

                {
                  name: "[" + (arrayIndex + 2).toString() + "]   Name",
                  value: userCardNameArray[arrayIndex + 1],
                  inline: true,
                },
                {
                  name: "Rarity",
                  value: userCardRarityArray[arrayIndex + 1],
                  inline: true,
                },
                {
                  name: "Price",
                  value: userCardPriceArray[arrayIndex + 1],
                  inline: true,
                },

                {
                  name: "[" + (arrayIndex + 3).toString() + "]   Name",
                  value: userCardNameArray[arrayIndex + 2],
                  inline: true,
                },
                {
                  name: "Rarity",
                  value: userCardRarityArray[arrayIndex + 2],
                  inline: true,
                },
                {
                  name: "Price",
                  value: userCardPriceArray[arrayIndex + 2],
                  inline: true,
                }
              )
              .setTimestamp(Date.now()),

            new EmbedBuilder()
              .setURL("https://example.org/")
              .setImage(userCardImgArray[arrayIndex + 1]),
            new EmbedBuilder()
              .setURL("https://example.org/")
              .setImage(userCardImgArray[arrayIndex + 2]),
          ];

          if (arraySize <= 4) {
            await interaction.reply({
              embeds,
            });
          } else if (onPage == 1 && pageChanged == false) {
            await interaction.reply({
              embeds,
              components: [actionRowRight],
            });
          } else if (onPage == 2) {
            await i.editReply({ embeds, components: [actionRowLeft] });
          } else if (onPage == 1 && pageChanged == true) {
            await i.editReply({ embeds, components: [actionRowRight] });
          }

          break;
        case 4:
          var embeds = [
            new EmbedBuilder()
              .setURL("https://example.org/")
              .setImage(userCardImgArray[arrayIndex])
              .setTitle(userName + `'s Binder \t Page [ ` + onPage + ` ]`)
              .setThumbnail(userAvatar)
              .addFields(
                {
                  name: "[" + (arrayIndex + 1).toString() + "]   Name",
                  value: userCardNameArray[arrayIndex],
                  inline: true,
                },
                {
                  name: "Rarity",
                  value: userCardRarityArray[arrayIndex],
                  inline: true,
                },
                {
                  name: "Price",
                  value: userCardPriceArray[arrayIndex],
                  inline: true,
                },

                {
                  name: "[" + (arrayIndex + 2).toString() + "]   Name",
                  value: userCardNameArray[arrayIndex + 1],
                  inline: true,
                },
                {
                  name: "Rarity",
                  value: userCardRarityArray[arrayIndex + 1],
                  inline: true,
                },
                {
                  name: "Price",
                  value: userCardPriceArray[arrayIndex + 1],
                  inline: true,
                },

                {
                  name: "[" + (arrayIndex + 3).toString() + "]   Name",
                  value: userCardNameArray[arrayIndex + 2],
                  inline: true,
                },
                {
                  name: "Rarity",
                  value: userCardRarityArray[arrayIndex + 2],
                  inline: true,
                },
                {
                  name: "Price",
                  value: userCardPriceArray[arrayIndex + 2],
                  inline: true,
                },

                {
                  name: "[" + (arrayIndex + 4).toString() + "]   Name",
                  value: userCardNameArray[arrayIndex + 3],
                  inline: true,
                },
                {
                  name: "Rarity",
                  value: userCardRarityArray[arrayIndex + 3],
                  inline: true,
                },
                {
                  name: "Price",
                  value: userCardPriceArray[arrayIndex + 3],
                  inline: true,
                }
              )
              .setTimestamp(Date.now()),

            new EmbedBuilder()
              .setURL("https://example.org/")
              .setImage(userCardImgArray[arrayIndex + 1]),
            new EmbedBuilder()
              .setURL("https://example.org/")
              .setImage(userCardImgArray[arrayIndex + 2]),
            new EmbedBuilder()
              .setURL("https://example.org/")
              .setImage(userCardImgArray[arrayIndex + 3]),
          ];

          if (arraySize <= 4) {
            await interaction.reply({
              embeds,
            });
          } else if (onPage == 1 && pageChanged == false) {
            await interaction.reply({
              embeds,
              components: [actionRowRight],
            });
          } else if (onPage == 2) {
            await i.editReply({ embeds, components: [actionRowLeft] });
          } else if (onPage == 1 && pageChanged == true) {
            await i.editReply({ embeds, components: [actionRowRight] });
          }

          break;

        default:
          await interaction.reply({
            content: "You have no Cards in Your Binder",
            ephemeral: true,
          });
          break;
      }
    }

    const filter = (i) => i.isButton() && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 15000,
    });

    // Listen for button clicks
    collector.on("collect", async (i) => {
      if (i.customId === "leftPage_button_id") {
        pageChanged = true;
        onPage = 1;
        await i.deferUpdate();
        await binderBuilder(i);
      } else if (i.customId === "rightPage_button_id") {
        onPage = 2;
        await i.deferUpdate();
        await binderBuilder(i);
      }
    });

    collector.on("end", async (collected) => {
      await interaction.editReply({
        components: [],
      });
      if (arraySize > 4) {
        await interaction.followUp({
          content: "Binder closed after a while the energy needed to keep it open was too big",
          ephemeral: true,
        });
      }
    });

    timeout.push(interaction.user.id);
    setTimeout(() => {
      timeout.shift();
    }, 16000);
  },
};
