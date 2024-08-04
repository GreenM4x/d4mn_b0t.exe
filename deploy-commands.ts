import { REST, Routes, RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import { readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { config } from 'dotenv';
import { pathToFileURL, fileURLToPath } from 'node:url';

config(); // Load environment variables

const __dirname = dirname(fileURLToPath(import.meta.url));
const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
const commandsPath = join(__dirname, 'commands');

async function loadCommandFiles(): Promise<void> {
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

async function deployCommands(): Promise<void> {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.CLIENT_ID;

    if (!token) {
        throw new Error('DISCORD_TOKEN is not defined in the environment variables.');
    }

    if (!clientId) {
        throw new Error('CLIENT_ID is not defined in the environment variables.');
    }

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);
        const data = await rest.put(Routes.applicationCommands(clientId), {
            body: commands,
        }) as RESTPostAPIChatInputApplicationCommandsJSONBody[];

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
}

async function main(): Promise<void> {
    await loadCommandFiles();
    await deployCommands();
}

main().catch(console.error);