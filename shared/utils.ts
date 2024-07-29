import { EmbedBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder } from 'discord.js';
import { getCardData } from './card.js';
import { type CardEmbedData } from './models/card.models.js';
import { type BinderCard } from './models/binder.models.js';

interface EmbedOptions {
  title: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  color?: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  timestamp?: number;
  url?: string;
  description?: string;
  footer?: { text: string; iconURL?: string };
}

const createEmbed = ({
  title,
  fields,
  color,
  imageUrl,
  thumbnailUrl,
  timestamp,
  url,
  description,
  footer,
}: EmbedOptions): EmbedBuilder => {
  const embed = new EmbedBuilder().setTitle(title).setColor(color || 0).setURL(url || null);

  if (thumbnailUrl) {
    embed.setThumbnail(thumbnailUrl);
  }

  if (imageUrl) {
    embed.setImage(imageUrl);
  }

  if (fields) {
    embed.addFields(fields);
  }

  if (timestamp) {
    embed.setTimestamp(timestamp);
  }

  if (description) {
    embed.setDescription(description);
  }

  if (footer) {
    embed.setFooter(footer);
  }

  return embed;
};

const createFilterMenu = (cardData: CardEmbedData[], activeFilters: string[] = []): StringSelectMenuBuilder => {
  const typeOptions = Array.from(new Set(cardData.map((card) => card.type))).sort();
  const rarityOptions = Array.from(new Set(cardData.map((card) => card.rarity))).sort();

  const options = [
    ...typeOptions.map((option) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(option)
        .setValue(`type_${option}`)
        .setDefault(activeFilters.includes(`type_${option}`)),
    ),
    ...rarityOptions.map((option) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(option)
        .setValue(`rarity_${option}`)
        .setDefault(activeFilters.includes(`rarity_${option}`)),
    ),
  ];

  return new StringSelectMenuBuilder()
    .setCustomId('type_rarity_filter_select_id_binder')
    .setPlaceholder('Filter by Type or Rarity')
    .addOptions(options)
    .setMinValues(0)
    .setMaxValues(options.length);
};

const filterCards = (cards: [CardEmbedData, number][], filters: string[] | undefined): [CardEmbedData, number][] => {
  if (!filters || !filters.length) return cards;

  const typeFilters = filters
      .filter((filter) => filter.startsWith('type_'))
      .map((filter) => filter.replace('type_', ''));
  const rarityFilters = filters
      .filter((filter) => filter.startsWith('rarity_'))
      .map((filter) => filter.replace('rarity_', ''));

  return cards.filter(([card]) => {
      const typeMatch = typeFilters.length === 0 || typeFilters.includes(card.type);
      const rarityMatch = rarityFilters.length === 0 || rarityFilters.includes(card.rarity);
      return typeMatch && rarityMatch;
  });
};

const createSortMenu = (activeSort: string | undefined): StringSelectMenuBuilder => {
  const sortMenu = new StringSelectMenuBuilder()
    .setCustomId('sort_select_id_binder')
    .setPlaceholder('Sort by')
    .addOptions([
      {
        label: 'Sort by: Rarity',
        value: 'sort_rarity',
        default: activeSort === 'sort_rarity',
      },
      {
        label: 'Sort by: Price',
        value: 'sort_price',
        default: activeSort === 'sort_price',
      },
      {
        label: 'Sort by: Type',
        value: 'sort_type',
        default: activeSort === 'sort_type',
      },
    ]);

  return sortMenu;
};

const sortCards = (cards: [CardEmbedData, number][], sortBy: string | undefined): [CardEmbedData, number][] => {
  if (!sortBy) return cards;

  const sortedCards = [...cards];

  switch (sortBy) {
      case 'sort_rarity':
          sortedCards.sort(([a], [b]) => a.rarity.localeCompare(b.rarity));
          break;
      case 'sort_price':
          sortedCards.sort(([a], [b]) => parseFloat(b.price) - parseFloat(a.price));
          break;
      case 'sort_type':
          sortedCards.sort(([a], [b]) => a.type.localeCompare(b.type));
          break;
      default:
          break;
  }

  return sortedCards;
};

const calculateBinderValue = (cards: BinderCard[]): number => {
  return cards.reduce((totalValue, card) => {
    const cardData = getCardData(card);
    return totalValue + (cardData ? parseFloat(cardData.price) : 0);
  }, 0);
};

// Fisher-Yates shuffle algorithm (https://javascript.info/task/shuffle)
const shuffle = <T>(array: T[]): T[] => {
  const shuffledArray = [...array];
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j]!, shuffledArray[i]!];
  }
  return shuffledArray;
};

export {
  createEmbed,
  createFilterMenu,
  filterCards,
  calculateBinderValue,
  shuffle,
  createSortMenu,
  sortCards,
};