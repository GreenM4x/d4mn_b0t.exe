const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  AttachmentBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getUserData, writeDb } = require("../db/dbFunctions");
const { getCardData } = require("../shared/card");

const COMMAND_NAME = "trade";
const SOME_RANDOM_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

module.exports = {
  data: new SlashCommandBuilder()
    .setName(COMMAND_NAME)
    .setDescription("Trade cards with another duelist")
    .addUserOption((option) =>
      option.setName("user").setDescription("The duelist to trade with").setRequired(true)
    ),
  async execute(interaction) {
    const targetUser = interaction.options.getUser("user");
    if (targetUser.bot) {
      return await interaction.reply({
        content: "You cannot trade with bots.",
        ephemeral: true,
      });
    }

    const userBinder = await getUserData(interaction.user.id);
    const targetBinder = await getUserData(targetUser.id);

    if (!userBinder || userBinder.cards.length === 0) {
      return await interaction.reply({
        content: "You don't have any cards to trade.",
        ephemeral: true,
      });
    }

    if (!targetBinder || targetBinder.cards.length === 0) {
      return await interaction.reply({
        content: `${targetUser.username} doesn't have any cards to trade.`,
        ephemeral: true,
      });
    }

    let userSelectMenu = new StringSelectMenuBuilder()
      .setCustomId("user_select_trade")
      .setPlaceholder(`Choose a card from ${interaction.user.username}'s binder`)
      .addOptions(
        userBinder.cards.map((card, index) => ({
          label: `${getCardData(card).name} - ${getCardData(card).rarity} - ${getCardData(card).price}€`,
          value: index.toString(),
        }))
      );

    let targetSelectMenu = new StringSelectMenuBuilder()
      .setCustomId("target_select_trade")
      .setPlaceholder(`Choose a card from ${targetUser.username}'s binder`)
      .addOptions(
        targetBinder.cards.map((card, index) => ({
          label: `${getCardData(card).name} - ${getCardData(card).rarity} - ${getCardData(card).price}€`,
          value: index.toString(),
        }))
      );

    let userActionRow = new ActionRowBuilder().addComponents(userSelectMenu);
    let targetActionRow = new ActionRowBuilder().addComponents(targetSelectMenu);

    let tradeEmbed = new EmbedBuilder()
      .setTitle(`Trade Preview`)
      .setURL(SOME_RANDOM_URL)
      .setDescription("Select cards from both binders to preview the trade.");

    const imageEmbeds = [
      new EmbedBuilder()
        .setImage(`attachment://back.webp`)
        .setURL(SOME_RANDOM_URL),
      new EmbedBuilder()
        .setImage(`attachment://back.webp`)
        .setURL(SOME_RANDOM_URL)
    ];
    const attachments = [
      new AttachmentBuilder(`./db/images/back.webp`, {
        name: `back.webp`,
      }),
      new AttachmentBuilder(`./db/images/back.webp`, {
        name: `back.webp`,
      })
    ];

    const cancelTradeButton = new ButtonBuilder()
      .setCustomId("cancel_trade")
      .setLabel("Cancel Trade")
      .setStyle(ButtonStyle.Secondary);

    let tradeActionRow = new ActionRowBuilder().addComponents(cancelTradeButton);

    await interaction.reply({
      content: `Trade a card with <@${targetUser.id}>!`,
      embeds: [tradeEmbed, ...imageEmbeds],
      components: [userActionRow, targetActionRow, tradeActionRow],
      files: [...attachments],
    });

    let userSelectedCardIndex, targetSelectedCardIndex;
    let userCardToTrade, targetCardToTrade;

    let userAccepted = false;
    let targetUserAccepted = false;
    const updateTradeEmbed = async () => {
      if (userSelectedCardIndex !== undefined || targetSelectedCardIndex !== undefined) {
        tradeEmbed.setURL(SOME_RANDOM_URL);
        userCardToTrade = getCardData(userBinder.cards[userSelectedCardIndex]);
        targetCardToTrade = getCardData(targetBinder.cards[targetSelectedCardIndex]);
        if (userSelectedCardIndex !== undefined) {
          userSelectMenu = new StringSelectMenuBuilder()
            .setCustomId("user_select_trade")
            .setPlaceholder(userCardToTrade.name)
            .addOptions(
              userBinder.cards.map((card, index) => ({
                label: `${getCardData(card).name} - ${getCardData(card).rarity} - ${getCardData(card).price}€`,
                value: index.toString(),
                default: index === userSelectedCardIndex,
              }))
            );
          userActionRow = new ActionRowBuilder().addComponents(userSelectMenu);
        }

        if (targetSelectedCardIndex !== undefined) {
          targetSelectMenu = new StringSelectMenuBuilder()
            .setCustomId("target_select_trade")
            .setPlaceholder(targetCardToTrade.name)
            .addOptions(
              targetBinder.cards.map((card, index) => ({
                label: `${getCardData(card).name} - ${getCardData(card).rarity} - ${getCardData(card).price}€`,
                value: index.toString(),
                default: index === targetSelectedCardIndex,
              }))
            );
          targetActionRow = new ActionRowBuilder().addComponents(targetSelectMenu);

        }

        if (userSelectedCardIndex === undefined && targetSelectedCardIndex !== undefined) {
          tradeEmbed.setFields(
            {
              name: `${targetUser.username}'s Card`,
              value: `${targetCardToTrade.name} - ${targetCardToTrade.rarity} - ${targetCardToTrade.price}€`,
            });
        } else if (userSelectedCardIndex !== undefined && targetSelectedCardIndex === undefined) {
          tradeEmbed.setFields(
            {
              name: `${interaction.user.username}'s Card`,
              value: `${userCardToTrade.name} - ${userCardToTrade.rarity} - ${userCardToTrade.price}€`,
            },

          );
        } else if (userSelectedCardIndex !== undefined && targetSelectedCardIndex !== undefined) {
          tradeEmbed.setFields(
            {
              name: `${interaction.user.username}'s Card`,
              value: `${userCardToTrade.name} - ${userCardToTrade.rarity} - ${userCardToTrade.price}€`,
            },
            {
              name: `${targetUser.username}'s Card`,
              value: `${targetCardToTrade.name} - ${targetCardToTrade.rarity} - ${targetCardToTrade.price}€`,
            }
          );
        }

        if (userSelectedCardIndex !== undefined) {
          imageEmbeds[0] =
            new EmbedBuilder()
              .setImage(`attachment://${userCardToTrade.id}.jpg`)
              .setURL(SOME_RANDOM_URL)

          attachments[0] =
            new AttachmentBuilder(`./db/images/${userCardToTrade.id}.jpg`, {
              name: `${userCardToTrade.id}.jpg`,
            })
        } else {
          imageEmbeds[0] =
            new EmbedBuilder()
              .setImage(`attachment://back.webp`)
              .setURL(SOME_RANDOM_URL)
          attachments[0] =
            new AttachmentBuilder(`./db/images/back.webp`, {
              name: `back.webp`,
            })
        }
        if (targetSelectedCardIndex !== undefined) {
          imageEmbeds[1] =
            new EmbedBuilder()
              .setImage(`attachment://${targetCardToTrade.id}.jpg`)
              .setURL(SOME_RANDOM_URL)
            ;
          attachments[1] =
            new AttachmentBuilder(`./db/images/${targetCardToTrade.id}.jpg`, {
              name: `${targetCardToTrade.id}.jpg`,
            })
        } else {
          imageEmbeds[1] = (
            new EmbedBuilder()
              .setImage(`attachment://back.webp`)
              .setURL(SOME_RANDOM_URL)
          );
          attachments[1] =
            new AttachmentBuilder(`./db/images/back.webp`, {
              name: `back.webp`,
            })
        }

        const nbAccepted = (userAccepted ? 1 : 0) + (targetUserAccepted ? 1 : 0);
        const acceptTradeButton = new ButtonBuilder()
          .setCustomId("accept_trade")
          .setLabel(`Accept Trade ${nbAccepted}/2`)
          .setStyle(ButtonStyle.Success);

        if (userSelectedCardIndex !== undefined && targetSelectedCardIndex !== undefined) {
          tradeActionRow = new ActionRowBuilder().addComponents(acceptTradeButton, cancelTradeButton);
        }

        await interaction.editReply({
          embeds: [tradeEmbed, ...imageEmbeds],
          components: [userActionRow, targetActionRow, tradeActionRow],
          files: [...attachments],
        });
      }
    };

    const filter = (i) =>
      (i.user.id === interaction.user.id || i.user.id === targetUser.id) &&
      (i.customId === "cancel_trade" ||
        i.customId === "accept_trade" ||
        i.customId === "user_select_trade" ||
        i.customId === "target_select_trade");
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 60000,
    });


    collector.on("collect", async (i) => {
      await i.deferUpdate();
      if (i.customId === "user_select_trade") {
        userSelectedCardIndex = parseInt(i.values[0]);
        await updateTradeEmbed();
      } else if (i.customId === "target_select_trade") {
        targetSelectedCardIndex = parseInt(i.values[0]);
        await updateTradeEmbed();
      }

      if (i.customId === "accept_trade") {
        if (i.user.id === interaction.user.id) {
          userAccepted = true;
          await updateTradeEmbed();
        } else if (i.user.id === targetUser.id) {
          targetUserAccepted = true;
          await updateTradeEmbed();
        }
        if (userAccepted && targetUserAccepted) {
          // Swap cards
          const temp = userBinder.cards[userSelectedCardIndex];
          userBinder.cards[userSelectedCardIndex] = targetBinder.cards[targetSelectedCardIndex];
          targetBinder.cards[targetSelectedCardIndex] = temp;

          // Update user data in the database
          writeDb(userBinder);
          writeDb(targetBinder);

          await disableTradeEmbed();
          // Notify both users of a successful trade
          await interaction.followUp({
            content: `${interaction.user.username} successfully traded **${userCardToTrade.name}** with ${targetUser.username}'s **${targetCardToTrade.name}**.`,
          });

          collector.stop();
        }
      } else if (i.customId === "cancel_trade") {
        await disableTradeEmbed();
        await interaction.followUp({
          content: "Trade canceled.",
        });
        collector.stop();
      }
    });

    collector.on("end", async (collected, reason) => {
      if (reason === "time") {
        await disableTradeEmbed();
        await interaction.followUp({
          content: "Trade session timed out. No trade occurred.",
        });
      }
    });

    async function disableTradeEmbed() {
      userActionRow?.components.forEach((component) => {
        component.setDisabled(true);
      });

      targetActionRow?.components.forEach((component) => {
        component.setDisabled(true);
      });

      if (tradeActionRow) {
        tradeActionRow?.components.forEach((component) => {
          component.setDisabled(true);
        });
        await interaction.editReply({
          components: [userActionRow, targetActionRow, tradeActionRow],
        });
        return;
      }

      await interaction.editReply({
        components: [userActionRow, targetActionRow],
      });
    }
  },
};
