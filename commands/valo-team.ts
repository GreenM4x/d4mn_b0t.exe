import {
	type ChatInputCommandInteraction,
	type CacheType,
	SlashCommandBuilder,
	VoiceChannel,
} from 'discord.js';
import ExtendedClient from '../shared/music/ExtendedClient.js';
import { shuffle } from '../shared/utils.js';

const data = new SlashCommandBuilder()
	.setName('valo-team')
	.setDescription('Generate the most optimal Valo comp (wink, wink)');

async function execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<void> {
	const client = interaction.client as ExtendedClient;
	const guildId = interaction.guildId;

	if (!guildId) {
		await interaction.followUp('This command can only be used in a server.');
		return;
	}

	const guild = client.guilds.cache.get(guildId);

	const member = guild?.members.cache.get(interaction.user.id);
	const voiceChannel = member?.voice.channelId;
	if (!voiceChannel) {
		await interaction.reply("You're not in a voice channel!");
		return;
	}

	const channel = client.channels.cache.get(voiceChannel) as VoiceChannel;
	const members = channel.members;

	const allValorantAgents = [
		'Brimstone',
		'Killjoy',
		'Raze',
		'Reyna',
		'Astra',
		'Fade',
		'Cypher',
		'Neon',
		'Omen',
		'Phoenix',
		'Breach',
		'Jett',
		'Sage',
		'Viper',
		'Sova',
		'KAY/O',
		'Skye',
		'Harbor',
		'Yoru',
		'Chamber',
		'Gekko',
		'Deadlock',
		'Iso',
		'Clove',
		'Vyse',
	];

	const shuffledAgents = shuffle(allValorantAgents);
	const team = shuffledAgents.slice(0, members?.size ?? 5);

	let message = 'A freshly baked Valorant team\n';
	let i = 1;
	members?.forEach((member) => {
		const agent = team[i - 1] ?? 'you choose 🩵';
		message += `${i}. <@${member.id}> - ${getAgentEmoji(agent)} ${agent}\n`;
		i++;
	});

	await interaction.reply(message);

	// const embed = new EmbedBuilder()
	// 	.setColor(6345206)
	// 	.setTitle('Valorant Team')
	// 	.setDescription(message)
	// 	.setTimestamp()
	// 	.setFooter({ text: 'gl hf' });
	// await interaction.channel?.send({ embeds: [embed] });
}

const getAgentEmoji = (agent: string): string => {
	const agentEmojis = [
		'<:brimstone:1283522995398119424>',
		'<:killjoy:1283522996753006744>',
		'<:raze:1283522997856112781>',
		'<:reyna:1283522999122919434>',
		'<:astra:1283523000313974885>',
		'<:fade:1283523001454821456>',
		'<:cypher:1283523002817970258>',
		'<:neon:1283523003812155413>',
		'<:omen:1283523480905846888>',
		'<:phoenix:1283523007666585721>',
		'<:breach:1283523527374405846>',
		'<:jett:1283523010787283039>',
		'<:sage:1283523012997681182>',
		'<:viper:1283523608970399745>',
		'<:sova:1283523017128935444>',
		'<:kayo:1283523658601594992>',
		'<:skye:1283523020601950258>',
		'<:harbor:1283523768135716915>',
		'<:yoru:1283523024154394655>',
		'<:chamber:1283523811240841226>',
		'<:gekko:1283523853863096424>',
		'<:deadlock:1283523908846485611>',
		'<:iso:1283523031146168482>',
		'<:clove:1283523966945988640>',
		'<:vyse:1283523983987445771>',
	];

	return (
		agentEmojis.find((emoji) => {
			if (agent === 'KAY/O') {
				return emoji.includes('kayo');
			}
			return emoji.includes(agent.toLowerCase());
		}) ?? ''
	);
};

export { data, execute };
