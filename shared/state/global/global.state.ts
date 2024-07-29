import { type BoosterPack } from '../../models/boosterpack.models.js';
import { type CardData } from '../../models/card.models.js';

let cardInfo: CardData | null = null;
let boosterPackInfo: BoosterPack[] | null = null;

export function setCardInfo(data: CardData): void {
	cardInfo = data;
}

export function getCardInfo(): CardData | null {
	return cardInfo;
}

export function setBoosterPackInfo(data: BoosterPack[]): void {
	boosterPackInfo = data;
}

export function getBoosterPackInfo(): BoosterPack[] | null {
	return boosterPackInfo;
}

