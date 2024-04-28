const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop-quiz')
        .setDescription('End a music quiz'),
    async execute(interaction) {
        const client = interaction.client;
        const userVoiceChannelId = interaction.member.voice.channelId; // ID of the user's voice channel

        if (!userVoiceChannelId) {
            return interaction.reply({ content: 'You are not in any voice channel.', ephemeral: true });
        }

        // Check if the bot is in a voice channel
        const player = client.music.players.get(interaction.guildId);
        if (!player) {
            return interaction.reply({ content: 'No active music quiz found.', ephemeral: true });
        }

        // Check for an active trivia collector and stop it if exists
        const trivia = client.triviaMap.get(interaction.guildId);
        if (trivia && trivia.collector) {
            trivia.wasTriviaEndCalled = true;
            trivia.collector.stop();
        }

        // Leave the voice channel
        await client.music.leaveVoiceChannel(interaction.guildId);
        client.triviaMap.delete(interaction.guildId); // Clear trivia data for the guild

        return interaction.reply('Ended the music quiz!');
    }
};
