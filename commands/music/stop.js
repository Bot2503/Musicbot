const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds.js');
const { checkPermissions } = require('../../utils/permissions.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the music and clear the queue'),

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

            if (!queue || !queue.playing) {
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

            // Check if user has DJ permissions or if they're the only one in voice channel
            const hasPermission = await checkPermissions(interaction.member, 'dj') || 
                                 queue.voiceChannel.members.filter(member => !member.user.bot).size <= 1;

            if (!hasPermission) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Permission Denied', 'You need DJ permissions to stop the music!')],
                    ephemeral: true
                });
            }

            // Clear the queue
            const songsCleared = queue.songs.length;
            queue.songs = [];
            queue.playing = false;
            queue.loop = false;
            queue.loopQueue = false;

            // Clear timeout if exists
            if (queue.timeout) {
                clearTimeout(queue.timeout);
                queue.timeout = null;
            }

            // Stop the player
            if (queue.player) {
                queue.player.stop();
            }

            // Disconnect from voice channel
            if (queue.connection) {
                queue.connection.destroy();
            }

            // Remove queue from memory
            interaction.client.musicQueues.delete(interaction.guild.id);

            const embed = createEmbed('error', 
                `${interaction.client.config.emojis.stop} Music Stopped`, 
                `Music stopped and queue cleared (${songsCleared} song${songsCleared !== 1 ? 's' : ''} removed).\nBot disconnected from voice channel.`
            );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Stop command error:', error);
            await interaction.reply({
                embeds: [createEmbed('error', 'Stop Error', 'An error occurred while trying to stop the music.')],
                ephemeral: true
            });
        }
    }
};
