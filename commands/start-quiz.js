const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const {
  getRandom,
  normalizeValue,
  capitalizeWords,
  getLeaderBoard
} = require('../shared/music/utils');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('start-quiz')
    .setDescription('Better than MEE6'),
  async execute(interaction) {
    await interaction.deferReply();
    const client = interaction.client;
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.followUp(
        ':no_entry: Wtf... You\'re not in a voice channel!'
      );
    }

    if (
      client.music.players.get(interaction.guildId) &&
      client.triviaMap.get(interaction.guildId)
    ) {
      return interaction.followUp(
        'Wait until the current music quiz ends'
      );
    }

    if (
      client.music.players.get(interaction.guildId) &&
      !client.triviaMap.get(interaction.guildId)
    ) {
      return interaction.followUp(
        'Wait until the music queue gets empty and try again!'
      );
    }

    const jsonSongs = fs.readFileSync('./db/music/songs.json', 'utf-8');
    // console.log('jsonSongs :>> ', jsonSongs);
    const songsArray = getRandom(JSON.parse(jsonSongs), 5);
    // console.log('songsArray :>> ', songsArray);
    console.log('voiceChannel.id :>> ', voiceChannel.id);
    console.log('interaction.guildId :>> ', interaction.guildId);
    console.log('interaction.channel.id :>> ', interaction.channel.id);
    const player = await client.music.joinVoiceChannel({
      guildId: interaction.guildId,
      channelId: voiceChannel.id,
      shardId: interaction.guild?.shardId ?? 0,
      messageChannelId: interaction.channel.id,
      // shardId: 0,
      // textChannelId: interaction.channel.id,
      // selfDeaf: true,
      // selfMute: false,
      // volume: 50
    });

    // player.queue.channel = interaction.channel;

    const tracks = [];
    for (let i = 0; i < 1; i++) {
      const result = await player.node.rest.resolve("ytsearch:taylorswift");
      if(!result.data.length) {
        console.log('No tracks found');
        continue;
      };
      const metadata = result.data.shift();
      tracks.push(metadata);
    }
    
    const startTriviaEmbed = new EmbedBuilder()
      .setColor('#ff7373')
      .setTitle(':notes: Starting Music Quiz!')
      .setDescription(
        `:notes: Get ready!`
      );
    interaction.followUp({ embeds: [startTriviaEmbed] });
   
    const score = new Map();

    const membersInChannel = interaction.member.voice.channel.members;
    membersInChannel.each(user => {
      if (user.user.bot) return;
      score.set(user.user.username, 0);
    });
    playTrivia(interaction.channel, player, songsArray, score, tracks);
    
  }
};

async function playTrivia(textChannel, player, songsArray, score, tracks, i = 0) {
  const currentTrack = tracks[i];
  // Randomize a number but one that won't be too close to the track ending
  // const max = player.queue.tracks?.[0]?.info.duration ?? 20000; // milliseconds
  // const min = 10 * 1000; // milliseconds
  // const randomTime = Math.floor(Math.random() * (max - min + 1)) + min;
  if (!player.playing) {
    await player.playTrack({ track: { encoded: currentTrack.encoded } })
    await player.setGlobalVolume(1000);
  } else {
    await player.skip();
  }

  await player.seekTo(10);

  let songNameFound = false;
  let songSingerFound = false;

  const skippedArray = [];

  const collector = textChannel.createMessageCollector({
    time: 30000
  });

  textChannel.client.triviaMap.set(textChannel.guildId, {
    collector,
    wasTriviaEndCalled: false
  });

  collector.on('collect', msg => {
    if (!score.has(msg.author.username)) return;
    let guess = normalizeValue(msg.content);
    let title = songsArray[0].title.toLowerCase();
    let singers = songsArray[0].singers;

    if (guess === 'skip') {
      if (skippedArray.includes(msg.author.username)) {
        return;
      }
      skippedArray.push(msg.author.username);
      if (skippedArray.length > score.size * 0.6) {
        return collector.stop();
      }
      return;
    }

    // if user guessed both singer and song name
    if (
      singers.some(value => guess.includes(normalizeValue(value))) &&
      guess.includes(title)
    ) {
      if (
        (songSingerFound && !songNameFound) ||
        songNameFound & !songSingerFound
      ) {
        score.set(msg.author.username, score.get(msg.author.username) + 1);
        msg.react('☑');
        return collector.stop();
      }
      score.set(msg.author.username, score.get(msg.author.username) + 3);
      msg.react('☑');
      return collector.stop();
    }
    // if user guessed only the singer
    else if (singers.some(value => guess.includes(normalizeValue(value)))) {
      if (songSingerFound) return; // already been guessed
      songSingerFound = true;
      if (songNameFound && songSingerFound) {
        score.set(msg.author.username, score.get(msg.author.username) + 1);
        msg.react('☑');
        return collector.stop();
      }

      score.set(msg.author.username, score.get(msg.author.username) + 1);
      msg.react('☑');
    }
    // if user guessed song title
    else if (guess.includes(title)) {
      if (songNameFound) return; // already been guessed
      songNameFound = true;

      if (songNameFound && songSingerFound) {
        score.set(msg.author.username, score.get(msg.author.username) + 1);
        msg.react('☑');
        return collector.stop();
      }

      score.set(msg.author.username, score.get(msg.author.username) + 1);
      msg.react('☑');
    }
    // wrong answer
    else {
      return msg.react('❌');
    }
  });

  collector.on('end', async () => {
    const client = textChannel.client;
    const trivia = client.triviaMap.get(textChannel.guildId);
    // if stop-trivia was called
    if (trivia.wasTriviaEndCalled) {
      client.triviaMap.delete(textChannel.guildId);
      return;
    }

    const sortedScoreMap = new Map(
      [...score.entries()].sort(function (a, b) {
        return b[1] - a[1];
      })
    );

    const song = `${capitalizeWords(
      songsArray[0].singers[0]
    )}: ${capitalizeWords(songsArray[0].title)}`;

    const embed = new EmbedBuilder()
      .setColor('#ff7373')
      .setTitle(`:musical_note: The song was:  ${song}`)
      .setDescription(getLeaderBoard(Array.from(sortedScoreMap.entries())));

    textChannel.send({ embeds: [embed] });

    songsArray.shift();

    if (!songsArray.length) {
      const embed = new EmbedBuilder()
        .setColor('#ff7373')
        .setTitle('Music Quiz Results:')
        .setDescription(getLeaderBoard(Array.from(sortedScoreMap.entries())));

      textChannel.send({ embeds: [embed] });

      player.leaveVoiceChannel(player.guildId);
      client.music.destroyPlayer(player.guildId);
      client.triviaMap.delete(textChannel.guildId);
      return;
    }

    return playTrivia(textChannel, player, songsArray, score, tracks, i++);
  });
}