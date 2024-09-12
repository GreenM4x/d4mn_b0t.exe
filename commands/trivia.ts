import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	EmbedBuilder,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
} from 'discord.js';
import fetch from 'node-fetch';
import type { TriviaQuestion, TriviaResponse } from '../shared/models/trivia.model.js';
import { shuffle } from '../shared/utils.js';

const data = new SlashCommandBuilder().setName('trivia').setDescription('Start a Trivia Quiz');

async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	await interaction.deferReply({ ephemeral: true });

	const option_1 = new ButtonBuilder()
		.setCustomId('option_1')
		.setStyle(ButtonStyle.Secondary)
		.setEmoji('🔵');

	const option_2 = new ButtonBuilder()
		.setCustomId('option_2')
		.setStyle(ButtonStyle.Secondary)
		.setEmoji('🟩');

	const option_3 = new ButtonBuilder()
		.setCustomId('option_3')
		.setStyle(ButtonStyle.Secondary)
		.setEmoji('🔶');

	const option_4 = new ButtonBuilder()
		.setCustomId('option_4')
		.setStyle(ButtonStyle.Secondary)
		.setEmoji('❤️');

	const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		option_1,
		option_2,
		option_3,
		option_4,
	);

	try {
		// Fetch the trivia response from the API
		const response = await fetch('https://opentdb.com/api.php?amount=5&type=multiple');
		const jsonData = await response.json(); // jsonData is of type unknown by default

		// Assert that the response is of type TriviaResponse
		const data: TriviaResponse = jsonData as TriviaResponse; // Explicit type assertion
		// Check if the response code is 0 (success)
		if (data.response_code === 0) {
			const questionToDisplay: EmbedBuilder = prepareQuestion(data.results[1]);
			await interaction.editReply({
				embeds: [questionToDisplay],
				components: [actionRow],
			});
		} else {
			await interaction.editReply('Failed to load trivia questions. Please try again later.');
		}
	} catch (error) {
		console.error('Error fetching trivia questions:', error);
		await interaction.editReply(
			'An error occurred while fetching trivia questions. Please try again later.',
		);
	}
}

function prepareQuestion(question: TriviaQuestion | undefined): EmbedBuilder {
	let randomAnswer: string[] | undefined = [];
	randomAnswer = question?.incorrect_answers.concat([question.correct_answer]) ?? [];
	randomAnswer = shuffle(randomAnswer);

	const embed = new EmbedBuilder()
		.setTitle('Question [Number]')
		.setDescription('React with the symbole of the right answer.')
		.addFields(
			{
				name: 'Category:',
				value: `${modifyString(question?.category)}`,
				inline: false,
			},
			{
				name: 'Question:',
				value: `${question?.question}`,
				inline: false,
			},
			{
				name: '🔵 ' + `${randomAnswer[0]}`,
				value: '\u200B',
				inline: false,
			},
			{
				name: '🟩 ' + `${randomAnswer[1]}`,
				value: '\u200B',
				inline: false,
			},
			{
				name: '🔶 ' + `${randomAnswer[2]}`,
				value: '\u200B',
				inline: false,
			},
			{
				name: '❤️ ' + `${randomAnswer[3]}`,
				value: '\u200B',
				inline: false,
			},
			{
				name: 'Answer',
				value: `${question?.correct_answer}`,
				inline: false,
			},
		)
		.setColor('#ffffff')
		.setTimestamp();

	// Format the question for display
	return embed;
}

function modifyString(input: string | undefined): string {
	return (
		input
			?.replaceAll('&quot;', `"`)
			.replaceAll('&#039;', `'`)
			.replaceAll('&sup', '^')
			.replaceAll('&amp;', '&') ?? ''
	);
}

export { data, execute };
