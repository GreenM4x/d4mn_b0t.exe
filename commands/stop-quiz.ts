import { SlashCommandBuilder, type ChatInputCommandInteraction, type CacheType } from 'discord.js';
import ExtendedClient from '../shared/music/ExtendedClient.js';

export interface Trivia {
	wasTriviaEndCalled: boolean;
	collector: { stop: () => void };
}

const data = new SlashCommandBuilder().setName('stop-quiz').setDescription('End a music quiz');

async function execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<void> {
	const client = interaction.client as ExtendedClient;
	const guildId = interaction.guildId;

	if (!guildId) {
		await interaction.reply({
			content: 'This command can only be used in a server.',
			ephemeral: true,
		});
		return;
	}

	const guild = client.guilds.cache.get(guildId);

	if (!guild) {
		await interaction.reply({
			content: 'This command can only be used in a server.',
			ephemeral: true,
		});
		return;
	}

	const member = guild.members.cache.get(interaction.user.id);

	if (!member) {
		await interaction.reply({
			content: 'You are not in the server.',
			ephemeral: true,
		});
		return;
	}

	const voiceChannelId = member.voice.channelId;

	if (!voiceChannelId) {
		await interaction.reply({ content: 'You are not in any voice channel.', ephemeral: true });
		return;
	}

	const player = client.music?.players.get(guildId);
	if (!player) {
		await interaction.reply({ content: 'No active music quiz found.', ephemeral: true });
		return;
	}

	client.quizActive[guildId] = false;

	if (client.triviaMap.has(guildId)) {
		const trivia = client.triviaMap.get(guildId) as Trivia;
		if (trivia && trivia.collector) {
			trivia.wasTriviaEndCalled = true;
			trivia.collector.stop();
		}
		client.triviaMap.delete(guildId);
	}

	await client.music?.leaveVoiceChannel(guildId);
	await interaction.reply('Music quiz ended!');
}

export { data, execute };
