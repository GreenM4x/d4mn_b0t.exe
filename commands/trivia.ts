import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	EmbedBuilder,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	CollectorFilter,
	MessageComponentInteraction,
	ButtonInteraction,
} from 'discord.js';
import fetch from 'node-fetch';
import type { TriviaQuestion, TriviaResponse } from '../shared/models/trivia.model.js';
import { shuffle } from '../shared/utils.js';
import { TRIVIA_TIMEOUT } from '../shared/variables.js';

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
		if (data.response_code === 0 && data.results.length > 0) {
			let score = 0;
			let currentQuestionIndex = 0;

			// Ensure the question exists before moving forward
			let question: TriviaQuestion | undefined = data.results[currentQuestionIndex];

			// If no question, handle the error case
			if (!question) {
				await interaction.editReply(
					'Failed to load trivia questions. Please try again later.',
				);
				return;
			}

			let randomAnswer: string[] = shuffle(
				question.incorrect_answers.concat([question.correct_answer]),
			);

			let questionToDisplay: EmbedBuilder = prepareQuestion(question, randomAnswer);
			await interaction.editReply({
				embeds: [questionToDisplay],
				components: [actionRow],
			});

			const filter: CollectorFilter<[MessageComponentInteraction]> = (
				i: MessageComponentInteraction,
			) => {
				return i.user.id === interaction.user.id && i.isButton();
			};

			const collector = interaction.channel!.createMessageComponentCollector({
				filter,
				time: TRIVIA_TIMEOUT,
			});

			collector.on('collect', async (i: ButtonInteraction) => {
				const correct = await checkForWin(i, randomAnswer, question);
				if (correct) score++; // Increment score if correct

				currentQuestionIndex++;

				if (currentQuestionIndex < data.results.length) {
					// Get the next question and ensure it's defined
					question = data.results[currentQuestionIndex];
					if (!question) {
						await interaction.editReply('Failed to load the next question.');
						collector.stop();
						return;
					}

					randomAnswer = shuffle(
						question.incorrect_answers.concat([question.correct_answer]),
					);

					// Update with the new question
					questionToDisplay = prepareQuestion(question, randomAnswer);
					await interaction.editReply({
						content: `Your score: ${score}/${currentQuestionIndex}`,
						embeds: [questionToDisplay],
						components: [actionRow],
					});
				} else {
					// End of quiz
					await interaction.editReply({
						content: `Quiz over! Your final score is ${score}/${data.results.length}.`,
						embeds: [],
						components: [],
					});
					collector.stop(); // End the collector
				}
			});

			collector.on('end', async () => {
				await interaction.editReply({
					content: `Time's up! Your final score is ${score}/${data.results.length}.`,
					embeds: [],
					components: [],
				});
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

async function checkForWin(
	i: ButtonInteraction,
	randomAnswer: string[],
	question: TriviaQuestion | undefined,
): Promise<boolean> {
	let isCorrect = false;
	switch (i.customId) {
		case 'option_1':
			isCorrect = randomAnswer[0] === question?.correct_answer;
			break;
		case 'option_2':
			isCorrect = randomAnswer[1] === question?.correct_answer;
			break;
		case 'option_3':
			isCorrect = randomAnswer[2] === question?.correct_answer;
			break;
		case 'option_4':
			isCorrect = randomAnswer[3] === question?.correct_answer;
			break;
	}

	await i.update({
		content: isCorrect
			? `You got it! The correct answer is: ${question?.correct_answer}`
			: `Wrong answer! The correct answer was: ${question?.correct_answer}`,
		components: [],
	});

	return isCorrect;
}

function prepareQuestion(
	question: TriviaQuestion | undefined,
	randomAnswer: string[],
): EmbedBuilder {
	const embed = new EmbedBuilder()
		.setTitle('Question')
		.setDescription('React with the symbol of the correct answer.')
		.addFields(
			{
				name: 'Category:',
				value: `${modifyString(question?.category)}`,
				inline: false,
			},
			{
				name: 'Question:',
				value: `${modifyString(question?.question)}`,
				inline: false,
			},
			{
				name: '🔵 ' + modifyString(randomAnswer[0]),
				value: '\u200B',
				inline: false,
			},
			{
				name: '🟩 ' + modifyString(randomAnswer[1]),
				value: '\u200B',
				inline: false,
			},
			{
				name: '🔶 ' + modifyString(randomAnswer[2]),
				value: '\u200B',
				inline: false,
			},
			{
				name: '❤️ ' + modifyString(randomAnswer[3]),
				value: '\u200B',
				inline: false,
			},
		)
		.setColor('#ffffff')
		.setTimestamp();

	return embed;
}

function modifyString(input: string | undefined): string {
	return (
		input
			?.replaceAll('&quot;', `"`)
			.replaceAll('&#039', `'`)
			.replaceAll('&sup', '^')
			.replaceAll('&amp;', '&') ?? ''
	);
}

export { data, execute };
