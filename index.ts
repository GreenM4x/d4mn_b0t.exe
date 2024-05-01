/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Events, Interaction, Client } from 'discord.js';
import dotenv from 'dotenv';
import ExtendedClient from './shared/music/ExtendedClient';
import { Shoukaku, Connectors } from 'shoukaku';

dotenv.config();

const client = new ExtendedClient();
const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), [
	{
		name: 'YugiBot',
		url: 'lavalink.lucask.dev',
		auth: 'someSecurePW',
		secure: true,
	},
]);
client.music = shoukaku;

const commandsPath = path.join(process.cwd(), 'commands');

async function loadCommands() {
	const commandFiles = await fs.readdir(commandsPath);
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const fileURL = pathToFileURL(filePath).href;
		try {
			let command;
			if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.cjs')) {
				command = await import(fileURL);
			}
			if (command.default && 'data' in command.default && 'execute' in command.default) {
				client.commands.set(command.default.data.name, command.default);
			} else if (command.data && 'execute' in command) {
				client.commands.set(command.data.name, command);
			} else {
				console.log(`[WARNING] The command at ${fileURL} is missing required properties.`);
			}
		} catch (error) {
			console.error(`Error loading command at ${fileURL}: ${error}`);
		}
	}
}

void loadCommands();

shoukaku.on('error', (_, error: Error) => console.error(error));

client.once(Events.ClientReady, (c: Client) => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

void client.login(process.env.GITHUB_TOKEN);

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
	if (!interaction.isChatInputCommand()) return;
	const command = client.commands.get(interaction.commandName);

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
