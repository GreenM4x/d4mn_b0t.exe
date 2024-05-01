const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop-quiz')
        .setDescription('End a music quiz'),
    async execute(interaction) {
        const client = interaction.client;
        const guildId = interaction.guildId;
        const voiceChannelId = interaction.member.voice.channelId;

        if (!voiceChannelId) {
            return interaction.reply({ content: 'You are not in any voice channel.', ephemeral: true });
        }

        const player = client.music.players.get(guildId);
        if (!player) {
            return interaction.reply({ content: 'No active music quiz found.', ephemeral: true });
        }

        client.quizActive[guildId] = false;

        if (client.triviaMap.has(guildId)) {
            const trivia = client.triviaMap.get(guildId);
            if (trivia && trivia.collector) {
                trivia.wasTriviaEndCalled = true;
                trivia.collector.stop();
            }
            client.triviaMap.delete(guildId);
        }
        
        await client.music.leaveVoiceChannel(guildId);
        return interaction.reply('Music quiz ended!');
    }
};
