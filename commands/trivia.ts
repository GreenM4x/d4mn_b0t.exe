import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import fetch from 'node-fetch';
import { TriviaQuestion, TriviaResponse } from '../shared/models/trivia.model';

const data = new SlashCommandBuilder().setName('trivia').setDescription('Start a Trivia Quiz');

async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	await interaction.deferReply({ ephemeral: true });

	try {
		// Fetch the trivia response from the API
		const response = await fetch('https://opentdb.com/api.php?amount=5&type=multiple');
		const jsonData = await response.json(); // jsonData is of type unknown by default

		// Assert that the response is of type TriviaResponse
		const data: TriviaResponse = jsonData as TriviaResponse; // Explicit type assertion
		// Check if the response code is 0 (success)
		if (data.response_code === 0) {
			let questionToDisplay = '';
			data.results.forEach((element) => {
				questionToDisplay += prepareQuestion(element) + '\n\n'; // Concatenate all questions
			});
			await interaction.editReply(questionToDisplay);
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

function prepareQuestion(question: TriviaQuestion): string {
	// Format the question for display
	return `**Category**: ${question.category}\n**Difficulty**: ${question.difficulty}\n**Question**: ${question.question}\n`;
}

export { data, execute };
