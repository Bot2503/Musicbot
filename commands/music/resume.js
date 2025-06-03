const { SlashCommandBuilder } = require('discord.js');
const { AudioPlayerStatus } = require('@discordjs/voice');
const { createEmbed } = require('../../utils/embeds.js');
const { checkPermissions } = require('../../utils/permissions.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the paused song'),

    async execute(interaction) {
        try {
            // Check if user is in the same voice channel
            const voiceChannel = interaction.member.voice.channel;
            const queue = interaction.client.musicQueues.get(interaction.guild.id);

            if (!voiceChannel) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Voice Channel Required', 'You need to be in a voice channel to use this command!')],
                    ephemeral: true
                });
            }

            if (!queue || !queue.player) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Nothing Playing', 'There is no music currently playing!')],
                    ephemeral: true
                });
            }

            if (voiceChannel !== queue.voiceChannel) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Wrong Voice Channel', 'You need to be in the same voice channel as the bot!')],
                    ephemeral: true
                });
            }

            // Check if not paused
            if (queue.player.state.status !== AudioPlayerStatus.Paused) {
                return interaction.reply({
                    embeds: [createEmbed('warning', 'Not Paused', 'The music is not paused!')],
                    ephemeral: true
                });
            }

            // Check if user has DJ permissions or if they're the only one in voice channel
            const hasPermission = await checkPermissions(interaction.member, 'dj') || 
                                 queue.voiceChannel.members.filter(member => !member.user.bot).size <= 1;

            if (!hasPermission && queue.songs[0]?.requestedBy?.id !== interaction.user.id) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Permission Denied', 'You need DJ permissions or be the song requester to resume!')],
                    ephemeral: true
                });
            }

            // Resume the player
            queue.player.unpause();

            const currentSong = queue.songs[0];
            const embed = createEmbed('secondary', 
                `${interaction.client.config.emojis.play} Music Resumed`, 
                currentSong ? `Resumed **${currentSong.title}**` : 'Music resumed'
            );

            if (currentSong?.thumbnail) {
                embed.setThumbnail(currentSong.thumbnail);
            }

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Resume command error:', error);
            await interaction.reply({
                embeds: [createEmbed('error', 'Resume Error', 'An error occurred while trying to resume the music.')],
                ephemeral: true
            });
        }
    }
};
