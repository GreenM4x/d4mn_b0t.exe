export interface Binder {
	userId: string;
	cards: BinderCard[];
	stats: {
		cardsAddedToBinder: number;
		cardsDiscarded: number;
		cardsGifted: number;
		cardsSold: number;
	};
	currency: number;
	dailyPurchases: {
		date: string;
		packs: { [packId: string]: number };
	};
}

export interface BinderCard {
	id: number;
	rarity: string;
}
