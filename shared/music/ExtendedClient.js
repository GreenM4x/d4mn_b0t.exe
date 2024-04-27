const { Client, GatewayIntentBits } = require('discord.js');

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


    this.queueHistory = new Map();

    this.triviaMap = new Map();
  }


}

module.exports = ExtendedClient;