const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { AudioPlayerStatus } = require('@discordjs/voice');
const { createEmbed, createMusicEmbed } = require('../../utils/embeds.js');
const { formatDuration } = require('../../utils/formatters.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show information about the currently playing song'),

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
            const isPaused = queue.player?.state.status === AudioPlayerStatus.Paused;

            // Get current progress
            const musicPlayer = interaction.client.musicPlayer;
            const currentProgress = musicPlayer ? musicPlayer.getCurrentProgress(queue) : 0;
            
            // Create modern UI music embed with current progress
            const embed = createMusicEmbed(currentSong, isPaused ? 'Paused' : 'Playing', queue);

            // Create modern control buttons
            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('music_previous')
                        .setEmoji('⏮️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(isPaused ? 'music_resume' : 'music_pause')
                        .setEmoji(isPaused ? '▶️' : '⏸️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_skip')
                        .setEmoji('⏭️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_favorite')
                        .setEmoji('❤️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_stop')
                        .setEmoji('⏹️')
                        .setStyle(ButtonStyle.Danger)
                );

            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('music_volume_down')
                        .setEmoji('🔉')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_volume_up')
                        .setEmoji('🔊')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_shuffle')
                        .setEmoji('🔀')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_loop')
                        .setEmoji('🔁')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_queue')
                        .setEmoji('📜')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.reply({ 
                embeds: [embed], 
                components: [row1, row2] 
            });

        } catch (error) {
            console.error('Now playing command error:', error);
            await interaction.reply({
                embeds: [createEmbed('error', 'Now Playing Error', 'An error occurred while retrieving the current song information.')],
                ephemeral: true
            });
        }
    }
};
