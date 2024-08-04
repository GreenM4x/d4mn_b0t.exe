import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

const data = new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!');

async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({ content: 'Secret Pong!', ephemeral: true });
}

export { data, execute };