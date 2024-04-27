const { Client, GatewayIntentBits } = require('discord.js');
const { LavalinkManager } = require("lavalink-client");
// const { lava_host, lava_pass } = require('../../config.json');
// require("dotenv").config();

class ExtendedClient extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
      ]
    });

    this.music = new LavalinkManager({
      nodes: [
        { // Important to have at least 1 node
          authorization: "someSecurePW",
          host: "pi",
          port: 2333,
          id: "quiz"
        }
      ],
      sendToShard: (guildId, payload) =>
        this.guilds.cache.get(guildId)?.shard?.send(payload),
      client: {
        id: process.env.CLIENT_ID,
        username: "YugiBot",
      },
      // everything down below is optional
      autoSkip: false,
      playerOptions: {
        clientBasedPositionUpdateInterval: 150,
        defaultSearchPlatform: "ytmsearch",
        volumeDecrementer: 0.75,
        //requesterTransformer: requesterTransformer,
        onDisconnect: {
          autoReconnect: true,
          destroyPlayer: false
        },
        onEmptyQueue: {
          destroyAfterMs: 30_000,
          //autoPlayFunction: autoPlayFunction,
        }
      },
      queueOptions: {
        maxPreviousTracks: 25
      },
    });

    this.queueHistory = new Map();

    this.triviaMap = new Map();

    // this.ws.on('VOICE_SERVER_UPDATE', data =>
    //   this.music.handleVoiceUpdate(data)
    // );
    // this.ws.on('VOICE_STATE_UPDATE', data =>
    //   this.music.handleVoiceUpdate(data)
    // );
  }
}

module.exports = ExtendedClient;