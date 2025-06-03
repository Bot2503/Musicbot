
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createMusicEmbed } = require('../../utils/embeds.js');
const { formatDuration, createProgressBar } = require('../../utils/formatters.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('progress')
        .setDescription('Show live progress of the currently playing song'),

    async execute(interaction) {
        try {
            const queue = interaction.client.musicQueues.get(interaction.guild.id);

            if (!queue || !queue.playing || !queue.songs[0]) {
                return interaction.reply({
                    embeds: [createEmbed('warning', 'Nothing Playing', 'There is no music currently playing!')],
                    ephemeral: true
                });
            }

            const currentSong = queue.songs[0];
            
            // Create initial embed with current progress
            const embed = createMusicEmbed(currentSong, 'Playing', queue);
            
            // Add refresh button
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('progress_refresh')
                        .setEmoji('🔄')
                        .setLabel('Refresh')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('progress_auto')
                        .setEmoji('⏱️')
                        .setLabel('Auto Update')
                        .setStyle(ButtonStyle.Primary)
                );

            const response = await interaction.reply({ 
                embeds: [embed], 
                components: [row],
                fetchReply: true
            });

            // Store the message for auto-updates
            queue.progressMessage = response;
            queue.progressChannelId = interaction.channel.id;

        } catch (error) {
            console.error('Progress command error:', error);
            await interaction.reply({
                embeds: [createEmbed('error', 'Progress Error', 'An error occurred while showing the progress.')],
                ephemeral: true
            });
        }
    }
};
