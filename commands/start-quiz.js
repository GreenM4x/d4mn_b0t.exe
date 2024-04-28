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
    const voiceChannel = interaction.member.voice.channelId;

    if (!voiceChannel) {
      return interaction.followUp(':no_entry: You\'re not in a voice channel!');
    }

    if (client.music.players.get(interaction.guildId) && client.triviaMap.get(interaction.guildId)) {
      return interaction.followUp('Wait until the current music quiz ends');
    }

    if (client.music.players.get(interaction.guildId) && !client.triviaMap.get(interaction.guildId)) {
      return interaction.followUp('Wait until the music queue gets empty and try again!');
    }

    const jsonSongs = fs.readFileSync('./db/music/songs.json', 'utf-8');
    const songsArray = getRandom(JSON.parse(jsonSongs), 3);

    const player = await client.music.joinVoiceChannel({
      guildId: interaction.guildId,
      channelId: voiceChannel,
      shardId: 0
    });

    const startTriviaEmbed = new EmbedBuilder()
      .setColor('#60D1F6')
      .setTitle(':musical_note: The Music Quiz will start shortly!')
      .setDescription(
        `This game will have **15 song** previews, **30 seconds** per song. \n\n
      You'll have to guess the **artist name** and the **song name**.`
      )
      .setFooter({ text: '🔥 Sit back relax, the music quiz is starting in **10 seconds**' });
    interaction.followUp({ embeds: [startTriviaEmbed] });

    const tracks = [];
    for (let song of songsArray) {
      const result = await player.node.rest.resolve(song.url);
      if (!result.data) {
        console.log('No tracks found for:', song.url);
        continue;
      }
      tracks.push(result.data);
    }

    const score = new Map();
    const membersInChannel = interaction.member.voice.channel.members;
    membersInChannel.each(user => {
      if (!user.user.bot) {
        score.set(user.user.id, 0);
      }
    });

    playTrivia(interaction, player, songsArray, score, tracks, 0);
  }
};

async function playTrivia(interaction, player, songsArray, score, tracks, index) {
  if (index >= tracks.length) {
    const finalEmbed = new EmbedBuilder()
      .setColor('#60D1F6')
      .setTitle('Music Quiz Finished!')
      .setDescription(getLeaderBoard(Array.from(score.entries())));
    interaction.channel.send({ embeds: [finalEmbed] });
    interaction.client.music.leaveVoiceChannel(player.guildId);
    interaction.client.triviaMap.delete(interaction.channel.guildId);
    return;
  }

  const currentTrack = tracks[index];
  console.log('Now playing:', currentTrack.info?.title);

  await player.playTrack({ track: { encoded: currentTrack.encoded } });
  let songNameFound = false;
  let songSingerFound = false;
  const skippedArray = [];

  
  const collector = interaction.channel.createMessageCollector({
    time: 30000
  });
  interaction.client.triviaMap.set(interaction.channel.guildId, {
    collector,
    wasTriviaEndCalled: false
  });

  collector.on('collect', msg => {
    if (!score.has(msg.author.id)) return;
    const guess = normalizeValue(msg.content);
    const title = normalizeValue(songsArray[index].title);
    const singers = songsArray[index].singers.map(normalizeValue);

    if (guess === 'skip' && !skippedArray.includes(msg.author.id)) {
      skippedArray.push(msg.author.id);
      if (skippedArray.length > score.size * 0.6) {
        collector.stop('skipped');
      }
      return;
    }

    const guessedSinger = singers.some(singer => guess.includes(singer));
    const guessedTitle = guess.includes(title);
    let reacted = false;

    if (guessedSinger && !songSingerFound) {
      songSingerFound = true;
      score.set(msg.author.id, score.get(msg.author.id) + 1);
      msg.react('✅');
      reacted = true;
    }
    
    if (guessedTitle && !songNameFound) {
      songNameFound = true;
      score.set(msg.author.id, score.get(msg.author.id) + 1);
      msg.react('✅');
      reacted = true;
    }
    
    if (songNameFound && songSingerFound) {
      console.log('Both guessed correctly.');
      collector.stop('guessed');
    } else if (!reacted) {
      msg.react('❌');
    }
});

  collector.on('end', (_, reason) => {
    const trivia = interaction.client.triviaMap.get(interaction.channel.guildId);
    if (trivia.wasTriviaEndCalled) {
      interaction.client.triviaMap.delete(interaction.channel.guildId);
      return;
    }

    if(reason === 'time' || reason === 'skipped' || reason === 'guessed') {
      const songInfo = `${capitalizeWords(songsArray[index].singers.join(", "))} - ${capitalizeWords(songsArray[index].title)}`;
      const resultEmbed = new EmbedBuilder()
        .setColor('#60D1F6')
        .setTitle(`It was: ${songInfo}`)
        .setThumbnail(currentTrack.info?.artworkUrl)
        .setDescription(getLeaderBoard(Array.from(score.entries())))
        .setFooter({ text: `Music Quiz - track ${index + 1}/${songsArray.length}` })

      interaction.channel.send({ embeds: [resultEmbed] });
    }

    if (reason !== 'skipped' || (songSingerFound || songNameFound)) {
      playTrivia(interaction, player, songsArray, score, tracks, index + 1);
    } else {
      interaction.channel.send('Song skipped');
      playTrivia(interaction, player, songsArray, score, tracks, index + 1);
    }
  });
}
