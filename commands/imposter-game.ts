import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	VoiceChannel,
	EmbedBuilder,
	GuildMember,
} from 'discord.js';
import ExtendedClient from '../shared/music/ExtendedClient.js';
import { AnimeApiResponse } from '../shared/models/anime.model.js';
import { shuffle } from '../shared/utils.js';

const data = new SlashCommandBuilder()
	.setName('imposter-game')
	.setDescription(
		'Everyone in the call gets a message with a movie except for one person. Who is it?',
	);

async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	await interaction.deferReply({ ephemeral: true });

	const client = interaction.client as ExtendedClient;
	const guildId = interaction.guildId;

	if (!guildId) {
		await interaction.editReply('This command can only be used in a server.');
		return;
	}

	const guild = client.guilds.cache.get(guildId);

	const member = guild?.members.cache.get(interaction.user.id);
	const voiceChannel = member?.voice.channelId;
	if (!voiceChannel) {
		await interaction.editReply("You're not in a voice channel!");
		return;
	}

	const channel = client.channels.cache.get(voiceChannel) as VoiceChannel;
	const members = channel.members;

	try {
		const response = await fetch('https://api.jikan.moe/v4/top/anime');
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const animeData: AnimeApiResponse = (await response.json()) as AnimeApiResponse;

		const selectedAnimeId: number = Math.floor(Math.random() * 25);
		const goodEmbed = new EmbedBuilder()
			.setTitle('You are not The Imposter')
			.setURL(`${animeData.data[selectedAnimeId]!.url}`)
			.setDescription(
				`Try to guess who's the Imposter by asking everyone questions. But you can only ask ONE question to each Player.`,
			)
			.addFields({
				name: 'Anime Name:',
				value: `${animeData.data[selectedAnimeId]!.title} | ${animeData.data[selectedAnimeId]!.title_english}`,
				inline: false,
			})
			.setImage(`${animeData.data[selectedAnimeId]!.images.jpg.large_image_url}`)
			.setColor('#4dff88');

		const badEmbed = new EmbedBuilder()
			.setTitle('You are The Imposter')
			.setDescription(
				`Try to be as Confident as possible so no one has a sus on you. You too have to ask questions but you can only ask ONE question to each Player.`,
			)
			.setImage('https://i.ibb.co/wzVPRWs/imposter.png')
			.setColor('#4dff88');

		let playerIds: string[] = Array.from(members.keys());

		playerIds = shuffle(playerIds);

		const failedDMs: string[] = [];

		for (let i = 0; i < playerIds.length; i++) {
			const playerId = playerIds[i] || '';
			const player: GuildMember | undefined = members.get(playerId);

			if (player) {
				try {
					if (i === 0) {
						await player.send({ embeds: [badEmbed] });
					} else {
						await player.send({ embeds: [goodEmbed] });
					}
				} catch (error) {
					console.error(`Failed to send DM to player ${playerId}:`, error);
					failedDMs.push(playerId);
				}
			}
		}

		let replyMessage = 'Game started! Check your DMs for your role.';
		if (failedDMs.length > 0) {
			replyMessage += ` Failed to send DMs to: ${failedDMs.map((id) => `<@${id}>`).join(', ')}. They may have DMs disabled.`;
		}

		await interaction.editReply(replyMessage);
	} catch (error) {
		console.error('Error fetching Anime:', error);
		await interaction.editReply(
			'An error occurred while fetching the Anime. Please try again later.',
		);
	}
}

export { data, execute };
