import { EmbedBuilder, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getUserData } from '../db/dbFunctions.js';
import { calculateBinderValue } from '../shared/utils.js';
import { Binder } from '../shared/models/binder.models.js';

const COMMAND_NAME = 'profile';

const data = new SlashCommandBuilder()
    .setName(COMMAND_NAME)
    .setDescription('Show your profile with various statistics');

async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const user = interaction.user;
    const binder: Binder | null = await getUserData(user.id);

    if (!binder || binder.cards.length === 0) {
        await interaction.reply({
            content: "You don't have any cards. Try the /draw command first",
            ephemeral: true,
        });
		return;
    }

    // Calculate statistics
    const numCards = binder.cards.length;
    const binderValue = calculateBinderValue(binder.cards);

    // Create and send the embed
    const embed = new EmbedBuilder()
        .setTitle(`${user.username}'s Profile`)
        .setThumbnail(user.displayAvatarURL())
        .setColor('#0099ff')
        .addFields(
            { name: 'Balance', value: `${binder.currency.toFixed(2)}€`, inline: true },
            { name: 'Total Cards', value: numCards.toString(), inline: true },
            { name: 'Binder Value', value: `${binderValue.toFixed(2)}€`, inline: true },
            { name: ' ', value: ' ', inline: false },
            {
                name: 'Cards Added to Binder',
                value: binder.stats.cardsAddedToBinder.toString(),
                inline: true,
            },
            {
                name: 'Cards Discarded',
                value: binder.stats.cardsDiscarded.toString(),
                inline: true,
            },
            { name: 'Cards Gifted', value: binder.stats.cardsGifted.toString(), inline: true },
            { name: 'Cards Sold', value: binder.stats.cardsSold.toString(), inline: false },
        )
        .setTimestamp();
    await interaction.reply({ embeds: [embed] });
}

export { data, execute };