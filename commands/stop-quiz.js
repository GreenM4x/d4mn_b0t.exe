const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop-quiz')
        .setDescription('End a music quiz'),
    execute(interaction) {
        const client = interaction.client;

        if (!client.triviaMap.has(interaction.guildId)) {
            return interaction.reply(
                'There is no music trivia playing at the moment!'
            );
        }

        const player = client.music.players.get(interaction.guildId);

        const trivia = client.triviaMap.get(interaction.guildId);
        const collector = trivia.collector;
        trivia.wasTriviaEndCalled = true;
        collector.stop();

        client.music.leaveVoiceChannel(player.guildId);
        return interaction.reply('Ended the music quiz!');
    }
};