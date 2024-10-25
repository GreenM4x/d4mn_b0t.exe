import {
	type ChatInputCommandInteraction,
	type CacheType,
	type GuildMember,
	type GuildChannel,
	SlashCommandBuilder,
	EmbedBuilder,
} from 'discord.js';
import * as fs from 'fs';
import {
	getRandom,
	getLeaderBoard,
	normalizeValue,
	capitalizeWords,
	similarity,
} from '../shared/music/utils.js';
import type { Player, Track, TrackResult } from 'shoukaku';
import ExtendedClient from '../shared/music/ExtendedClient.js';

type Song = {
	title: string;
	singers: string[];
	url: string;
};

const TIME_BETWEEN_SONGS = 2000;
const STRING_SIMILARITY_THRESHOLD = 0.85;

const data = new SlashCommandBuilder()
	.setName('start-quiz')
	.setDescription('Better than MEE6')
	.addIntegerOption((option) =>
		option
			.setName('number_of_songs')
			.setDescription('Number of songs to play in the quiz (default 15)')
			.setRequired(false),
	)
	.addStringOption((option) =>
		option
			.setName('source')
			.setDescription('Select the song source: default or recent')
			.setRequired(false)
			.addChoices(
				{ name: 'default', value: '3k-songs' },
				{ name: 'recent', value: 'recent-songs' },
			),
	);

async function execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<void> {
	await interaction.deferReply();
	const client = interaction.client as ExtendedClient;
	const guildId = interaction.guildId;

	if (!guildId) {
		await interaction.followUp('This command can only be used in a server.');
		return;
	}

	const guild = client.guilds.cache.get(guildId);

	const member = guild?.members.cache.get(interaction.user.id);
	const voiceChannel = member?.voice.channelId;
	if (!voiceChannel) {
		await interaction.followUp("You're not in a voice channel!");
		return;
	}

	const numberOfSongs = interaction.options.getInteger('number_of_songs') || 15;
	if (client.music?.players.get(guildId) && client.triviaMap.get(guildId)) {
		await interaction.followUp('Wait until the current music quiz ends');
		return;
	}

	const source = interaction.options.getString('source') || '3k-songs';
	const songPath = `./db/music/${source}.json`;
	const jsonSongs = fs.readFileSync(songPath, 'utf-8');
	const songsArray = getRandom(JSON.parse(jsonSongs) as Song[], numberOfSongs);

	const player = await client.music?.joinVoiceChannel({
		guildId: guildId,
		channelId: voiceChannel,
		shardId: 0,
	});

	client.quizActive = client.quizActive || {};
	client.quizActive[guildId] = true;

	const startTriviaEmbed = new EmbedBuilder()
		.setColor(6345206)
		.setTitle(':musical_note: The Music Quiz will start shortly!')
		.setDescription(
			`This game will have **${numberOfSongs} songs** previews, **30 seconds** per song.\n
You'll have to guess the **artist name** and the **song name**.\n
\`\`\`diff
+ 1 point for the artist name
+ 1 point for the song name
+ 3 points for both
\`\`\`\n
You can type \`skip\` to vote for passing a song.\n
:fire: Sit back relax, the music quiz is starting in **10 seconds**`,
		);
	await interaction.followUp({ embeds: [startTriviaEmbed] });

	if (!player) {
		await interaction.followUp('Failed to join voice channel.');
		return;
	}

	await playCountdownTrack(player);
	const tracks: Track[] = [];
	for (const song of songsArray) {
		const result = (await player?.node.rest.resolve(song.url)) as TrackResult;
		if (!result.data) {
			console.log('No tracks found for:', song.url);
			continue;
		}
		tracks.push(result.data);
	}
	const countdownResult = await playCountdown(player, interaction);
	if (!countdownResult) {
		console.log('Quiz was stopped during countdown.');
		return;
	}

	const score = new Map<string, number>();
	const membersInChannel = (interaction.member as GuildMember).voice.channel?.members;
	if (!membersInChannel) {
		await interaction.followUp('No members in the voice channel 🙁. Leaving...');
		void client.music?.leaveVoiceChannel(guildId);
		client.triviaMap.delete(guildId);
		return;
	}
	membersInChannel.each((user) => {
		if (!user.user.bot) {
			score.set(user.user.id, 0);
		}
	});

	void playTrivia(interaction, player, songsArray, score, tracks, 0);
}

async function playCountdown(
	player: Player,
	interaction: ChatInputCommandInteraction<CacheType>,
): Promise<boolean> {
	const client = interaction.client as ExtendedClient;
	let countdown = 11; // 10 seconds countdown
	while (countdown > 0) {
		if (interaction.guildId && !client.quizActive[interaction.guildId]) {
			console.log('Countdown halted.');
			return false;
		}
		await new Promise((resolve) => setTimeout(resolve, 1000));
		countdown--;
	}
	console.log('Countdown finished.');
	await player.stopTrack();
	await player.clearFilters();
	return true;
}

async function playCountdownTrack(player: Player) {
	await player.playTrack({
		track: {
			encoded:
				'QAAA0AMANDEwIFNlY29uZCBDb3VudERvd24gVGltZXIgV2l0aCBWb2ljZSBUbyBTdGFydCBBIFNob3cADlJhaW5ib3cgVGltZXJzAAAAAAAAxzgAC0hfYkIwc0FxTE5nAAEAK2h0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9SF9iQjBzQXFMTmcBADBodHRwczovL2kueXRpbWcuY29tL3ZpL0hfYkIwc0FxTE5nL21xZGVmYXVsdC5qcGcAAAd5b3V0dWJlAAAAAAAAAAA=',
		},
	});
	await player.seekTo(19000);
	await player.setGlobalVolume(80);
	await player.setTimescale({ speed: 1.4 });
}

async function playTrivia(
	interaction: ChatInputCommandInteraction<CacheType>,
	player: Player,
	songsArray: Song[],
	score: Map<string, number>,
	tracks: Track[],
	index: number,
) {
	const client = interaction.client as ExtendedClient;
	const guildId = interaction.guildId;

	if (!guildId || !client.quizActive[guildId]) {
		console.log('Quiz stopped or guild not found.');
		return;
	}

	if (index >= tracks.length) {
		const finalEmbed = new EmbedBuilder()
			.setColor(6345206)
			.setTitle('Music Quiz Finished!')
			.setDescription(getLeaderBoard(Array.from(score.entries())));
		await interaction.channel?.send({ embeds: [finalEmbed] });
		void client.music?.leaveVoiceChannel(player.guildId);
		client.triviaMap.delete(guildId);
		client.quizActive[guildId] = false;
		return;
	}

	const currentTrack = tracks[index];
	const trackLength = currentTrack?.info?.length ?? 5000;
	const minStart = 5000;
	const maxStart = trackLength - 35000;
	if (!trackLength || maxStart <= minStart || !currentTrack?.encoded) {
		void playTrivia(interaction, player, songsArray, score, tracks, index + 1);
		return;
	}
	const randomStart = Math.floor(Math.random() * (maxStart - minStart + 1)) + minStart;
	await player.playTrack({ track: { encoded: currentTrack.encoded } });
	console.log('Playing track:', currentTrack.info?.title + ' - ' + currentTrack.info?.author);
	await player.seekTo(randomStart);

	let songNameFoundBy: string | null = null;
	let songSingerFoundBy: string | null = null;
	const skippedArray: string[] = [];

	const collector = interaction.channel?.createMessageCollector({ time: 30000 });

	client.triviaMap.set(guildId, {
		wasTriviaEndCalled: false,
		collector: collector!,
	});

	const title = normalizeValue(songsArray?.[index]?.title ?? '');
	const singers: string[] | undefined = songsArray[index]?.singers.map(normalizeValue);
	collector?.on('collect', (msg) => {
		if (!score.has(msg.author.id)) return;
		const guess: string = normalizeValue(msg.content);

		if (guess === 'skip' && !skippedArray.includes(msg.author.id)) {
			skippedArray.push(msg.author.id);
			void interaction.channel?.send(
				`<@${msg.author.id}> voted to skip the song. ${skippedArray.length}/${score.size} votes.`,
			);
			if (skippedArray.length > score.size * 0.6) {
				collector.stop('skipped');
			}
			return;
		}

		const guessedSinger = singers?.some((singer) => {
			const sim = similarity(guess, singer);
			return sim > STRING_SIMILARITY_THRESHOLD;
		});
		const guessedTitle = similarity(guess, title) > STRING_SIMILARITY_THRESHOLD;
		let pointsAwarded = 0;
		let reacted = false;

		if (guessedSinger && !songSingerFoundBy) {
			songSingerFoundBy = msg.author.id;
			pointsAwarded++;
			void msg.react('✅');

			reacted = true;
		}

		if (guessedTitle && !songNameFoundBy) {
			songNameFoundBy = msg.author.id;
			pointsAwarded++;
			void msg.react('✅');
			reacted = true;
		}

		if (songSingerFoundBy && songNameFoundBy && songSingerFoundBy === songNameFoundBy) {
			pointsAwarded++;
		}

		if (pointsAwarded > 0) {
			const currentScore = score.get(msg.author.id) ?? 0;
			score.set(msg.author.id, currentScore + pointsAwarded);
			if (songSingerFoundBy && songNameFoundBy && songSingerFoundBy === songNameFoundBy) {
				void interaction.channel?.send(
					`<@${msg.author.id}>You guessed both correct! You earn **${pointsAwarded} points** :tada:`,
				);
			} else {
				void interaction.channel?.send(
					`<@${msg.author.id}> Correct! You earn **${pointsAwarded} point**`,
				);
			}
		}

		if (songNameFoundBy && songSingerFoundBy) {
			console.log('Both guessed correctly.');
			collector.stop('guessed');
		} else if (!reacted) {
			void msg.react('❌');
		}
	});

	collector?.on('end', async (_, reason) => {
		const guildId = (interaction.channel as GuildChannel).guildId;
		const trivia = client.triviaMap.get(guildId);
		if (!client.quizActive[guildId] || trivia?.wasTriviaEndCalled) {
			client.triviaMap.delete(guildId);
			return;
		}

		if (reason === 'time' || reason === 'skipped' || reason === 'guessed') {
			const songInfo = `${capitalizeWords(songsArray[index]?.singers?.join(', ') ?? '')} - ${capitalizeWords(songsArray[index]?.title ?? '')}`;
			const resultEmbed = new EmbedBuilder()
				.setColor(6345206)
				.setTitle(`It was: ${songInfo}`)
				.setThumbnail(currentTrack.info?.artworkUrl ?? '')
				.setDescription(getLeaderBoard(Array.from(score.entries())))
				.setFooter({ text: `Music Quiz - track ${index + 1}/${songsArray.length}` });

			void interaction.channel?.send({ embeds: [resultEmbed] });
		}

		if (reason !== 'skipped' || songSingerFoundBy || songNameFoundBy) {
			void player.stopTrack();
			await new Promise((resolve) => setTimeout(resolve, TIME_BETWEEN_SONGS));
			void playTrivia(interaction, player, songsArray, score, tracks, index + 1);
		} else {
			void interaction.channel?.send('Song skipped');
			void playTrivia(interaction, player, songsArray, score, tracks, index + 1);
		}
	});
}

export { data, execute };
