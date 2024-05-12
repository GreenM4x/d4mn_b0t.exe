/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client, GatewayIntentBits, Collection, MessageCollector } from 'discord.js';
import { Shoukaku } from 'shoukaku';

export type TriviaMap = {
	wasTriviaEndCalled: boolean;
	collector: MessageCollector;
};

class ExtendedClient extends Client {
	// @ts-expect-error
	music: Shoukaku | undefined;
	// @ts-expect-error
	queueHistory: Map<string, any>;
	// @ts-expect-error
	triviaMap: Map<string, any>;
	// @ts-expect-error
	commands: Collection<string, any>;
	// @ts-expect-error
	quizActive!: Record<string, boolean>;

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
