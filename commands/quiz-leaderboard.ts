import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getAllGlobalLeaderboard } from '../db/dbFunctions.js';
import { getLeaderBoard } from '../shared/music/utils.js';

const data = new SlashCommandBuilder()
	.setName('quiz-leaderboard')
	.setDescription('Displays the global leaderboard for the music quiz');

async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	const { guildId } = interaction;
	if (!guildId) {
		await interaction.reply({
			content: 'This command can only be used in a server.',
			ephemeral: true,
		});
		return;
	}
	const leaderboard = getAllGlobalLeaderboard()[guildId];

	if (!leaderboard || leaderboard.length === 0) {
		await interaction.reply({
			content: 'No leaderboard data available.',
			ephemeral: true,
		});
		return;
	}

	const formattedLeaderboard = getLeaderBoard(
		leaderboard.map((entry) => [entry.userId, entry.points]),
	);

	const embed = new EmbedBuilder()
		.setTitle('Global Music Quiz Leaderboard')
		.setColor(0x00ae86)
		.setDescription(formattedLeaderboard);

	await interaction.reply({ embeds: [embed] });
}

export { data, execute };
