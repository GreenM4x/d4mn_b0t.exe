import { Shoukaku } from 'shoukaku';
import { Collection } from 'discord.js';
import { TriviaMap } from './shared/music/ExtendedClient.js';

declare module 'discord.js' {
	export interface Client {
		music?: Shoukaku;
		queueHistory: Map<string, V>;
		triviaMap: Map<string, TriviaMap>;
		commands: Collection<string, V>;
		quizActive: Record<string, boolean>;
	}
}
