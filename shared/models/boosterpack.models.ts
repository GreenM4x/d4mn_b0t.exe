export interface BoosterPack {
	id: string;
	name: string;
	price: number;
	description: string;
	image: string;
	cards: {
		id: number;
		chance: number;
		rarity: string;
	}[];
}
