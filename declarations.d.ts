/* eslint-disable @typescript-eslint/no-explicit-any */
import { Shoukaku } from 'shoukaku';
import { Collection } from 'discord.js';
import { TriviaMap } from './shared/music/ExtendedClient.js';

declare module 'discord.js' {
	export interface Client {
		music?: Shoukaku;
		queueHistory: Map<string, any>;
		triviaMap: Map<string, TriviaMap>;
		commands: Collection<string, any>;
		quizActive: Record<string, boolean>;
	}
}
