const { EmbedBuilder } = require("discord.js");

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

exports.createEmbed = createEmbed;
