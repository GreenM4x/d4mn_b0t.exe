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
	ColorResolvable,
} from 'discord.js';
import fetch from 'node-fetch';
import type { TriviaQuestion, TriviaResponse } from '../shared/models/trivia.model.js';
import { shuffle } from '../shared/utils.js';
import { TRIVIA_QUESTION_TIME } from '../shared/variables.js';

const data = new SlashCommandBuilder().setName('trivia').setDescription('Start a Trivia Quiz');

async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	await interaction.deferReply();

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
		const response = await fetch('https://opentdb.com/api.php?amount=5&type=multiple');
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const jsonData: TriviaResponse = (await response.json()) as TriviaResponse;

		if (jsonData.response_code === 0 && jsonData.results.length > 0) {
			let currentQuestionIndex = 0;
			const scores: Map<string, number> = new Map();

			const loadQuestion = async () => {
				const question: TriviaQuestion | undefined = jsonData.results[currentQuestionIndex];
				if (!question) {
					await interaction.editReply(
						'Failed to load trivia questions. Please try again later.',
					);
					return;
				}

				const randomAnswer: string[] = shuffle([
					...question.incorrect_answers,
					question.correct_answer,
				]);

				let timeLeft = TRIVIA_QUESTION_TIME;
				const questionToDisplay: EmbedBuilder = prepareQuestion(
					question,
					randomAnswer,
					currentQuestionIndex,
					timeLeft,
				);
				const message = await interaction.editReply({
					embeds: [questionToDisplay],
					components: [actionRow],
				});

				const filter: CollectorFilter<[MessageComponentInteraction]> = (
					i,
				): i is ButtonInteraction => i.isButton();
				const collector = interaction.channel!.createMessageComponentCollector({
					filter,
					time: TRIVIA_QUESTION_TIME,
				});

				const answeredUsers = new Set<string>();

				const updateEmbed = async (): Promise<void> => {
					timeLeft -= 1000; // Decrease time left by 1 second
					if (timeLeft > 0) {
						const updatedEmbed = prepareQuestion(
							question,
							randomAnswer,
							currentQuestionIndex,
							timeLeft,
						);
						await message.edit({
							embeds: [updatedEmbed],
						});
					}
				};

				// Wrap the async function in a synchronous function
				const timer = setInterval(() => {
					updateEmbed().catch(console.error); // Handle errors in async function
				}, 1000);

				collector.on('collect', async (i: ButtonInteraction) => {
					clearInterval(timer); // Clear the timer when an answer is collected

					const userId = i.user.id;
					if (answeredUsers.has(userId)) {
						await i.reply({
							content: "You've already answered this question!",
							ephemeral: true,
						});
						return;
					}

					answeredUsers.add(userId);
					const correct = checkForWin(i, randomAnswer, question);

					if (!scores.has(userId)) scores.set(userId, 0);
					if (correct) scores.set(userId, (scores.get(userId) || 0) + 1);

					await i.reply({
						content: correct
							? `You got it! The correct answer is: ${modifyString(question.correct_answer)}`
							: `Wrong answer! The correct answer was: ${modifyString(question.correct_answer)}`,
						ephemeral: true,
					});
				});

				collector.on('end', async () => {
					clearInterval(timer); // Clear the timer when the collector ends

					currentQuestionIndex++;
					if (currentQuestionIndex < jsonData.results.length) {
						await loadQuestion();
					} else {
						const scoreboard = getScoreboard(scores);
						const winner = getWinner(scores);

						await interaction.editReply({
							content: `Quiz over! Final scores:\n${scoreboard}\nWinner: **${winner}**`,
							embeds: [],
							components: [],
						});
					}
				});
			};

			await loadQuestion();
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

function checkForWin(
	i: ButtonInteraction,
	randomAnswer: string[],
	question: TriviaQuestion,
): boolean {
	const index = parseInt(i.customId?.split('_')[1] ?? '');
	if (isNaN(index) || index < 1 || index > randomAnswer.length) {
		return false;
	}
	const selectedAnswer = randomAnswer[index - 1];
	return selectedAnswer === question.correct_answer;
}

function prepareQuestion(
	question: TriviaQuestion,
	randomAnswer: string[],
	currentQuestionIndex: number,
	timeLeft: number,
): EmbedBuilder {
	let qColor: ColorResolvable;
	switch (question.difficulty) {
		case 'easy':
			qColor = '#00FF00';
			break;
		case 'medium':
			qColor = '#FFA500';
			break;
		case 'hard':
			qColor = '#FF0000';
			break;
		default:
			qColor = '#FFFFFF';
			break;
	}

	const minutes = Math.floor(timeLeft / 60000);
	const seconds = Math.floor((timeLeft % 60000) / 1000);

	const embed = new EmbedBuilder()
		.setTitle(`Question: ${currentQuestionIndex + 1}`)
		.setDescription(
			`React with the symbol of the correct answer.\n\nTime left: ${minutes}:${seconds.toString().padStart(2, '0')}`,
		)
		.addFields(
			{
				name: 'Category:',
				value: modifyString(question.category),
				inline: false,
			},
			{
				name: 'Question:',
				value: modifyString(question.question),
				inline: false,
			},
			...randomAnswer.map((answer, index) => ({
				name: ['🔵', '🟩', '🔶', '❤️'][index] + ' ' + modifyString(answer),
				value: '\u200B',
				inline: false,
			})),
		)
		.setColor(qColor)
		.setTimestamp();

	return embed;
}

function modifyString(input: string | null | undefined): string {
	if (input == null) {
		return '';
	}
	return input
		.replaceAll('&quot;', '"')
		.replaceAll('&#039;', "'")
		.replaceAll('&sup', '^')
		.replaceAll('&amp;', '&');
}

function getScoreboard(scores: Map<string, number>): string {
	return Array.from(scores)
		.map(([userId, score]) => `<@${userId}>: ${score}`)
		.join('\n');
}

function getWinner(scores: Map<string, number>): string {
	let maxScore = -1;
	let winner = 'No one';

	for (const [userId, score] of scores) {
		if (score > maxScore) {
			maxScore = score;
			winner = `<@${userId}>`;
		}
	}

	return winner;
}

export { data, execute };
