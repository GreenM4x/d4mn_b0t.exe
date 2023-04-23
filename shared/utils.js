const {
  EmbedBuilder,
  StringSelectMenuOptionBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

const createEmbed = ({
  title,
  fields,
  color,
  imageUrl,
  thumbnailUrl,
  timestamp,
  url,
  description,
}) => {
  const embed = new EmbedBuilder().setTitle(title).setColor(color).setURL(url);

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

  return embed;
};

const createFilterMenu = (cardData, activeFilters = []) => {
  const typeOptions = Array.from(new Set(cardData.map((card) => card.type))).sort();
  const rarityOptions = Array.from(new Set(cardData.map((card) => card.rarity))).sort();

  const options = [
    ...typeOptions.map((option) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(option)
        .setValue(`type_${option}`)
        .setDefault(activeFilters.includes(`type_${option}`))
    ),
    ...rarityOptions.map((option) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(option)
        .setValue(`rarity_${option}`)
        .setDefault(activeFilters.includes(`rarity_${option}`))
    ),
  ];

  return new StringSelectMenuBuilder()
    .setCustomId("type_rarity_filter_select_id")
    .setPlaceholder("Filter by Type or Rarity")
    .addOptions(options)
    .setMinValues(0)
    .setMaxValues(options.length);
};

const filterCards = (cards, filters) => {
  if (!filters || !filters.length) return cards;

  const typeFilters = filters
    .filter((filter) => filter.startsWith("type_"))
    .map((filter) => filter.replace("type_", ""));
  const rarityFilters = filters
    .filter((filter) => filter.startsWith("rarity_"))
    .map((filter) => filter.replace("rarity_", ""));

  return cards.filter((card) => {
    const typeMatch = typeFilters.length === 0 || typeFilters.includes(card.type);
    const rarityMatch = rarityFilters.length === 0 || rarityFilters.includes(card.rarity);
    return typeMatch && rarityMatch;
  });
};

exports.createEmbed = createEmbed;
exports.createFilterMenu = createFilterMenu;
exports.filterCards = filterCards;
