import cardInfo from '../db/cardInfo.json' with { type: 'json' };

const getCardData = (binderCard, packId = null) => {
	if (!binderCard) return null;
	const cardDetails = cardInfo.data.find((card) => card.id === binderCard.id);
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
	const card = cardInfo.data[Math.floor(Math.random() * cardInfo.data.length)];
	const price = card.card_prices[0].cardmarket_price;
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

const getColorForCardType = (type) => {
	const typeColors = {
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

	// Find the first color that matches a partial key in the typeColors object
	const color = Object.keys(typeColors).find((key) => type.includes(key));
	return typeColors[color] || 0xffff00; // Default color if type not found
};

const getCardPrice = (cardDetails, rarity, packId = null) => {
	const isBasicRarity = ['Common', 'Rare', 'Super Rare'].includes(rarity);
	if (isBasicRarity) {
		return cardDetails.card_prices[0].cardmarket_price;
	}

	const packCode = packId ? packId.split('-')[0] : null;

	const price = cardDetails.card_sets.find(
		(set) => set.set_rarity === rarity && (!packId || set.set_code.includes(packCode)),
	);

	if (price?.set_price && parseFloat(price.set_price) > 0) {
		return price.set_price;
	}

	return cardDetails.card_prices[0].cardmarket_price;
};

export { getCardData, getRandomCard, getColorForCardType };
