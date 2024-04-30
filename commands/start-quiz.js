const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const {
  getRandom,
  normalizeValue,
  capitalizeWords,
  getLeaderBoard,
} = require("../shared/music/utils");
const fs = require("fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("start-quiz")
    .setDescription("Better than MEE6")
    .addBooleanOption((option) =>
      option
        .setName("hardcore")
        .setDescription("Enable hardcore mode (default false)")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("number_of_songs")
        .setDescription("Number of songs to play in the quiz (default 15)")
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const client = interaction.client;
    const voiceChannel = interaction.member.voice.channelId;

    if (!voiceChannel) {
      return interaction.followUp("You're not in a voice channel!");
    }

    const numberOfSongs = interaction.options.getInteger("number_of_songs") || 15;

    if (
      client.music.players.get(interaction.guildId) &&
      client.triviaMap.get(interaction.guildId)
    ) {
      return interaction.followUp("Wait until the current music quiz ends");
    }

    if (
      client.music.players.get(interaction.guildId) &&
      !client.triviaMap.get(interaction.guildId)
    ) {
      return interaction.followUp("Wait until the music queue gets empty and try again!");
    }

    const isHardcore = interaction.options.getBoolean("hardcore") || false;
    const songPath = isHardcore ? "./db/music/extended.json" : "./db/music/songs.json";
    const jsonSongs = fs.readFileSync(songPath, "utf-8");
    const songsArray = getRandom(JSON.parse(jsonSongs), numberOfSongs);

    const player = await client.music.joinVoiceChannel({
      guildId: interaction.guildId,
      channelId: voiceChannel,
      shardId: 0,
    });

    const startTriviaEmbed = new EmbedBuilder()
      .setColor("#60D1F6")
      .setTitle(":musical_note: The Music Quiz will start shortly!")
      .setDescription(
        `This game will have **${numberOfSongs} song** previews, **30 seconds** per song.\n
        You'll have to guess the **artist name** and the **song name**.\n
\`\`\`diff
+ 1 point for the artist name
+ 1 point for the song name
+ 3 points for both
\`\`\`\n
You can type \`skip\` to vote for passing a song.\n
:fire: Sit back relax, the music quiz is starting in **10 seconds**`
      );
    interaction.followUp({ embeds: [startTriviaEmbed] });

    await playCountdown(player);
    const tracks = [];
    for (let song of songsArray) {
      const result = await player.node.rest.resolve(song.url);
      if (!result.data) {
        console.log("No tracks found for:", song.url);
        continue;
      }
      tracks.push(result.data);
    }
    // wait for the countdown to finish
    await new Promise((resolve) => setTimeout(resolve, 15000));
    await player.stopTrack();

    const score = new Map();
    const membersInChannel = interaction.member.voice.channel?.members;
    if (!membersInChannel) {
      interaction.followUp("No members in the voice channel 🙁. Leaving...");
      interaction.client.music.leaveVoiceChannel(interaction.guildId);
      interaction.client.triviaMap.delete(interaction.channel.guildId);
      return;
    }
    membersInChannel.each((user) => {
      if (!user.user.bot) {
        score.set(user.user.id, 0);
      }
    });

    playTrivia(interaction, player, songsArray, score, tracks, 0);
  },
};

async function playCountdown(player) {
  // const countdownTrack = await player.node.rest.resolve("https://www.youtube.com/watch?v=H_bB0sAqLNg");
  await player.playTrack({ track: { encoded: 'QAAA0AMANDEwIFNlY29uZCBDb3VudERvd24gVGltZXIgV2l0aCBWb2ljZSBUbyBTdGFydCBBIFNob3cADlJhaW5ib3cgVGltZXJzAAAAAAAAxzgAC0hfYkIwc0FxTE5nAAEAK2h0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9SF9iQjBzQXFMTmcBADBodHRwczovL2kueXRpbWcuY29tL3ZpL0hfYkIwc0FxTE5nL21xZGVmYXVsdC5qcGcAAAd5b3V0dWJlAAAAAAAAAAA=' } });
  await player.seekTo(19000);
  await player.setGlobalVolume(80);
}

async function playTrivia(interaction, player, songsArray, score, tracks, index) {
  if (index >= tracks.length) {
    const finalEmbed = new EmbedBuilder()
      .setColor("#60D1F6")
      .setTitle("Music Quiz Finished!")
      .setDescription(getLeaderBoard(Array.from(score.entries())));
    interaction.channel.send({ embeds: [finalEmbed] });
    interaction.client.music.leaveVoiceChannel(player.guildId);
    interaction.client.triviaMap.delete(interaction.channel.guildId);
    return;
  }

  const currentTrack = tracks[index];
  const trackLength = currentTrack.info?.length;
  const minStart = 5000;
  // Maximum start time is 5 seconds before the end minus 30 seconds for the trivia duration
  const maxStart = trackLength - 35000;
  if (maxStart <= minStart) {
    playTrivia(interaction, player, songsArray, score, tracks, index + 1);
    return;
  }
  const randomStart = Math.floor(Math.random() * (maxStart - minStart + 1)) + minStart;
  console.log("Now playing:", currentTrack.info?.title, "at", randomStart / 1000, "seconds");
  await player.playTrack({ track: { encoded: currentTrack.encoded } });
  await player.seekTo(randomStart);

  let songNameFound = false;
  let songSingerFound = false;
  const skippedArray = [];

  const collector = interaction.channel.createMessageCollector({
    time: 30000,
  });
  interaction.client.triviaMap.set(interaction.channel.guildId, {
    collector,
    wasTriviaEndCalled: false,
  });

  collector.on("collect", (msg) => {
    if (!score.has(msg.author.id)) return;
    const guess = normalizeValue(msg.content);
    const title = normalizeValue(songsArray[index].title);
    const singers = songsArray[index].singers.map(normalizeValue);

    if (guess === "skip" && !skippedArray.includes(msg.author.id)) {
      skippedArray.push(msg.author.id);
      if (skippedArray.length > score.size * 0.6) {
        collector.stop("skipped");
      }
      return;
    }

    const guessedSinger = singers.some((singer) => guess.includes(singer));
    const guessedTitle = guess.includes(title);
    let reacted = false;

    if (guessedSinger && !songSingerFound) {
      songSingerFound = true;
      score.set(msg.author.id, score.get(msg.author.id) + 1);
      msg.react("✅");
      reacted = true;
    }

    if (guessedTitle && !songNameFound) {
      songNameFound = true;
      score.set(msg.author.id, score.get(msg.author.id) + 1);
      msg.react("✅");
      reacted = true;
    }

    if (songNameFound && songSingerFound) {
      console.log("Both guessed correctly.");
      collector.stop("guessed");
    } else if (!reacted) {
      msg.react("❌");
    }
  });

  collector.on("end", (_, reason) => {
    const trivia = interaction.client.triviaMap.get(interaction.channel.guildId);
    if (trivia.wasTriviaEndCalled) {
      interaction.client.triviaMap.delete(interaction.channel.guildId);
      return;
    }

    if (reason === "time" || reason === "skipped" || reason === "guessed") {
      const songInfo = `${capitalizeWords(
        songsArray[index].singers.join(", ")
      )} - ${capitalizeWords(songsArray[index].title)}`;
      const resultEmbed = new EmbedBuilder()
        .setColor("#60D1F6")
        .setTitle(`It was: ${songInfo}`)
        .setThumbnail(currentTrack.info?.artworkUrl)
        .setDescription(getLeaderBoard(Array.from(score.entries())))
        .setFooter({ text: `Music Quiz - track ${index + 1}/${songsArray.length}` });

      interaction.channel.send({ embeds: [resultEmbed] });
    }

    if (reason !== "skipped" || songSingerFound || songNameFound) {
      playTrivia(interaction, player, songsArray, score, tracks, index + 1);
    } else {
      interaction.channel.send("Song skipped");
      playTrivia(interaction, player, songsArray, score, tracks, index + 1);
    }
  });
}
