import { type BinderCard } from './models/binder.models.js';
import { type CardEmbedData, type CardData, type CardDetails } from './models/card.models.js';
import { getCardInfo } from './state/global/global.state.js';


const getCardData = (
	binderCard: BinderCard,
	packId: string | null = null,
): CardEmbedData | null => {
	if (!binderCard) return null;
	const cardData = getCardInfo()?.data ?? [];
	const cardDetails = cardData.find((card: CardDetails) => card.id === binderCard.id);
	if (!cardDetails) return null;

	const rarity = binderCard.rarity;
	const price = getCardPrice(cardDetails, rarity, packId);
	const img = `attachment://${binderCard.id}.jpg`;

	return {
		id: cardDetails.id,
		name: cardDetails.name,
		type: cardDetails.type,
		price: price,
		img: img,
		rarity: rarity,
	};
};

const getRandomCard = () => {
	const cardData = getCardInfo()?.data ?? [];
	const card = cardData[Math.floor(Math.random() * cardData.length)]!;
	const price = card.card_prices[0]?.cardmarket_price ?? '0';
	const img = `attachment://${card.id}.jpg`;
	const rarity =
		card.card_sets?.[Math.floor(Math.random() * (card.card_sets?.length || 1))]?.set_rarity ||
		'Common';

	return {
		id: card.id,
		name: card.name,
		type: card.type,
		price: price,
		img: img,
		rarity: rarity,
	};
};

const getColorForCardType = (type: string): number => {
	const typeColors: { [key: string]: number } = {
    Normal: 0xffff00, // Yellow
		Effect: 0xffa500, // Orange
		Ritual: 0xadd8e6, // Light blue
		Fusion: 0xee82ee, // Violet
		Synchro: 0xffffff, // White
		Xyz: 0x000000, // Black
		Pendulum: 0x008000, // Green
		Link: 0x00008b, // Dark blue
		Spell: 0x008000, // Green
		Trap: 0x800080, // Purple
		Token: 0x808080, // Gray
	};

	const color = Object.keys(typeColors).find((key) => type.includes(key));
	return color ? typeColors[color]! : 0xffff00;
};

const getCardPrice = (
	cardDetails: CardDetails,
	rarity: string,
	packId: string | null = null,
): string => {
	const isBasicRarity = ['Common', 'Rare', 'Super Rare'].includes(rarity);
	if (isBasicRarity) {
		return cardDetails.card_prices[0]?.cardmarket_price ?? '0';
	}

	const packCode = packId ? packId.split('-')[0]! : null;

	const price = cardDetails.card_sets.find(
		(set) => set.set_rarity === rarity && (!packId || set.set_code.includes(packCode ?? '')),
	);

	if (price?.set_price && parseFloat(price.set_price) > 0) {
		return price.set_price;
	}

	return cardDetails.card_prices[0]?.cardmarket_price ?? '0';
};

export { getCardData, getRandomCard, getColorForCardType };
