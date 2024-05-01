/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { Shoukaku } from 'shoukaku';

class ExtendedClient extends Client {
	music: Shoukaku | undefined;
	queueHistory: Map<string, any>;
	triviaMap: Map<string, any>;
	commands: Collection<string, any>;
	quizActive: Record<string, boolean>;

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
