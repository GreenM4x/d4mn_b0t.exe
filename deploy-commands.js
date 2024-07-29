import { REST, Routes } from 'discord.js';
import { readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { config } from 'dotenv';
import { pathToFileURL, fileURLToPath } from 'node:url';

config(); // Load environment variables

const __dirname = dirname(fileURLToPath(import.meta.url));
const commands = [];
const commandsPath = join(__dirname, 'commands');

async function loadCommandFiles() {
	const commandFiles = await readdir(commandsPath);
	const jsFiles = commandFiles.filter((file) => file.endsWith('.js'));

	for (const file of jsFiles) {
		const filePath = join(commandsPath, file);
		const module = await import(pathToFileURL(filePath).href);
		if ('data' in module && 'execute' in module) {
			commands.push(module.data.toJSON());
		} else {
			console.log(
				`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
			);
		}
	}
}

async function deployCommands() {
	const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);
		const data = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
			body: commands,
		});

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
}

async function main() {
	await loadCommandFiles();
	await deployCommands();
}

main();
