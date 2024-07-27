import { type CardData } from '../../models/card.models.js';

let cardInfo: CardData | null = null;

export function setCardInfo(data: CardData): void {
	cardInfo = data;
}

export function getCardInfo(): CardData | null {
	return cardInfo;
}
