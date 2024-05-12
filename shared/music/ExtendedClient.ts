import { Client, GatewayIntentBits, Collection, MessageCollector } from 'discord.js';

export type TriviaMap = {
	wasTriviaEndCalled: boolean;
	collector: MessageCollector;
};

class ExtendedClient extends Client {
	constructor() {
		super({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildMembers,
				GatewayIntentBits.GuildVoiceStates,
			],
		});

		this.queueHistory = new Map();
		this.triviaMap = new Map();
		this.commands = new Collection();
	}
}

export default ExtendedClient;
