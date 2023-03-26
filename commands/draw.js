const { SlashCommandBuilder, Client, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
const { writeDb } = require("../db/dbFunctions");

var timeout = [];

var cardName;
var cardImg;
var cardid;
var cardRarity

module.exports = {
	data: new SlashCommandBuilder()
		.setName('draw')
		.setDescription('Draw a card every 15min'),
	async execute(interaction) {

        if (timeout.includes(interaction.user.id)) return await interaction.reply({ content: `You are on a cooldown, try again later`, ephemeral: true});

        await fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php')
            .then(res => res.json())
            .then(data => {
                cardid = Math.floor(Math.random() * data.data.length);

                cardName = data.data[cardid].name;
                cardType = data.data[cardid].type;
                cardPrice = data.data[cardid].card_prices[0].cardmarket_price;
                cardImg = data.data[cardid].card_images[0].image_url;
                cardRarity = data.data[cardid].card_sets[
                    Math.floor(Math.random() * data.data[cardid].card_sets.length)
                ].set_rarity;
                
            
                
            });

            
        const accept = new ButtonBuilder()
                    .setCustomId('accept_button_id')
                    .setLabel('Place in Binder')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('❤️');
        

        const denial = new ButtonBuilder()
                        .setCustomId('denial_button_id')
                        .setLabel('Burn It')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔥');

        const actionRow = new ActionRowBuilder()
                        .addComponents(accept, denial);
    
		const exampleEmbed = new EmbedBuilder()
            .setColor(0x95f99f)
            .setTitle(cardName)
            .setImage(cardImg)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: 'Type', value: cardType, inline: true },
                { name: 'Rarity', value: cardRarity, inline: true },
                { name: 'Price', value: cardPrice, inline: true }
                
            )
            .setTimestamp(Date.now());
            
        await interaction.reply({
            embeds: [exampleEmbed],
            components: [actionRow]
        });

        const filter = i => i.isButton() && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

        // Listen for button clicks
        collector.on('collect', async i => {
        if (i.customId === 'accept_button_id') {

            // !!!! TO DO BINDER LIMIT !!!! //

            var dbdata = require("../db.json");
            
            dbIndex = dbdata.findIndex(x => x.userId === interaction.user.id);

            if(dbdata.some(item => item.userId == i.user.id)) {const userCardArray = dbdata[dbIndex].userCardId;
            if (userCardArray.length == 8) return await i.reply({ content: `Your Binder is full, delete a card first with the /delete command.`, ephemeral: true});
            }
                if(dbdata.some(item => item.userId == i.user.id)){
                    var dbIndex = dbdata.findIndex(x => x.userId === i.user.id)

                    //get current CardArrays
                    var CardArray = []
                    CardArray = dbdata[dbIndex].userCardId;
                    CardArray.push(cardid);

                    var RaritydArray = []
                    RaritydArray = dbdata[dbIndex].userCardRarity;
                    RaritydArray.push(cardRarity);
   
                    const dataObj = {
                        userId: i.user.id,
                        userCardId: CardArray,
                        userCardRarity: RaritydArray
                    }
    
                    writeDb(dataObj);

                } else {
                    const dataObj = {
                        userId: i.user.id,
                        userCardId: [cardid],
                        userCardRarity: [cardRarity]
                    }
    
                    writeDb(dataObj);
                }


            //Output Response
            await i.deferUpdate();
		    await i.editReply({components: []});
            await i.followUp({content: 'The card was sleaved and carefully put in your Binder!', ephemeral: true});



        } else if (i.customId === 'denial_button_id') {

		    //Output Response
            await i.deferUpdate();
            await i.editReply({components: []});                        
            await i.followUp({content: 'The Card was burned and floats now in the shadow realm!', ephemeral: true});
        }
        });

        collector.on('end', async collected =>{ 
            console.log(`Collected ${collected.size} items`)
            
            
                await interaction.editReply({
                    embeds: [exampleEmbed],
                    components: []
                });
                if(collected.size <= 0) await interaction.followUp({content: 'You waited too long, the card disappeared into the shadow realm!', ephemeral: true});
            


        });

        

        timeout.push(interaction.user.id);
        setTimeout(() => {
            timeout.shift();
        }, 900000);
	},
};
