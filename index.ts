import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import {
	Events,
	type Interaction,
	Client,
	ChatInputCommandInteraction,
	SlashCommandBuilder,
} from 'discord.js';
import dotenv from 'dotenv';
import { Shoukaku, Connectors } from 'shoukaku';
import ExtendedClient from './shared/music/ExtendedClient.js';
import { setCardInfo } from './shared/state/global/global.state.js';
import { CardData } from './shared/models/card.models.js';

type CustomCommand = {
	data: SlashCommandBuilder;
	execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};

dotenv.config();

const client = new ExtendedClient();
const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), [
	{
		name: 'd34m_bot.exe',
		url: process.env.LAVALINK_HOST || '',
		auth: process.env.LAVALINK_PW || '',
		secure: true,
	},
]);
client.music = shoukaku;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsPath = path.join(__dirname, 'commands');

async function loadCardInfo(): Promise<void> {
	const __dirname = import.meta.dirname;
	const cardInfoPath = path.join(__dirname, 'db', 'cardInfo.json');
	const cardInfoData = await fs.readFile(cardInfoPath, 'utf-8');
	setCardInfo(JSON.parse(cardInfoData) as CardData);
}

async function loadCommands() {
	const commandFiles = await fs.readdir(commandsPath);
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const fileURL = pathToFileURL(filePath).href;
		try {
			const command = (await import(fileURL)) as CustomCommand;
			if ('data' in command && 'execute' in command) {
				client.commands.set(command.data.name, command);
			} else {
				console.log(
					`[WARNING] The command at ${fileURL} is missing required properties.`,
					command,
				);
			}
		} catch (error) {
			console.error(error);
		}
	}
}

void loadCardInfo();
void loadCommands();

shoukaku.on('error', (_, error: Error) => console.error(error));

client.once(Events.ClientReady, (c: Client) => {
	console.log(`Ready! Logged in as ${c.user?.tag}`);
});

void client.login(process.env.GITHUB_TOKEN);

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
	if (!interaction.isChatInputCommand()) return;
	const command = client.commands.get(interaction.commandName) as CustomCommand;

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({
				content: 'There was an error while executing this command!',
				ephemeral: true,
			});
		} else {
			await interaction.reply({
				content: 'There was an error while executing this command!',
				ephemeral: true,
			});
		}
	}
});
