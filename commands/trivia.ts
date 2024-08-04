import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import fetch from 'node-fetch';

interface TriviaQuestion {
	category: string;
	type: string;
	difficulty: string;
	question: string;
	correct_answer: string;
	incorrect_answers: string[];
}

interface TriviaResponse {
	response_code: number;
	results: TriviaQuestion[];
}

const data = new SlashCommandBuilder().setName('trivia').setDescription('Start a Trivia Quiz');

async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	await interaction.deferReply({ ephemeral: true });

	try {
		const response: any = await fetch('https://opentdb.com/api.php?amount=5&type=multiple');
		const data: TriviaResponse = await response.json();

		if (data.response_code === 0) {
			let questionToDisplay = '';
			data.results.forEach((element) => {
				questionToDisplay = prepareQuestion(element);
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
	return question.question;
}

export { data, execute };
