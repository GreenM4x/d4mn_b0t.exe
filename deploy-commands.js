import { REST, Routes } from 'discord.js';
import { readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { config } from 'dotenv';
import { pathToFileURL, fileURLToPath } from 'node:url';

config(); // Load environment variables

const __dirname = dirname(fileURLToPath(import.meta.url));
const commands = [];
const commandsPath = join(__dirname, 'commands'); // Path for CommonJS commands
const distCommandsPath = join(__dirname, 'dist', 'commands'); // Path for transpiled TS commands

// Helper function to load command files from a specified directory
async function loadCommandFiles(directory) {
	const commandFiles = await readdir(directory);
	const jsAndCjsFiles = commandFiles.filter(
		(file) => file.endsWith('.js') || file.endsWith('.cjs'),
	);

	for (const file of jsAndCjsFiles) {
		const filePath = join(directory, file);
		const module = await import(pathToFileURL(filePath).href);
		commands.push(module.data.toJSON());
	}
}

// Function to deploy commands using the Discord API
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
	await loadCommandFiles(commandsPath); // Load CommonJS commands
	await loadCommandFiles(distCommandsPath); // Load transpiled TS commands
	await deployCommands();
}

main();
