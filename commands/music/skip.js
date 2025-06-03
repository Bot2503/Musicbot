const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds.js');
const { checkPermissions } = require('../../utils/permissions.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),

    async execute(interaction) {
        try {
            // Check if user is in the same voice channel
            const voiceChannel = interaction.member.voice.channel;
            const queue = interaction.client.musicQueues.get(interaction.guild.id);

            if (!voiceChannel) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Voice Channel Required', 'You need to be in a voice channel to use this command!')],
                    flags: 64
                });
            }

            if (!queue || !queue.playing) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Nothing Playing', 'There is no music currently playing!')],
                    flags: 64
                });
            }

            if (voiceChannel !== queue.voiceChannel) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Wrong Voice Channel', 'You need to be in the same voice channel as the bot!')],
                    flags: 64
                });
            }

            // Check if user has DJ permissions or if they're the only one in voice channel
            const hasPermission = await checkPermissions(interaction.member, 'dj') || 
                                 queue.voiceChannel.members.filter(member => !member.user.bot).size <= 1;

            if (!hasPermission && queue.songs[0]?.requestedBy?.id !== interaction.user.id) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Permission Denied', 'You need DJ permissions or be the song requester to skip!')],
                    ephemeral: true
                });
            }

            const currentSong = queue.songs[0];
            
            // Clear timeout if exists
            if (queue.timeout) {
                clearTimeout(queue.timeout);
                queue.timeout = null;
            }

            // Stop current song (this will trigger the next song to play)
            if (queue.player) {
                queue.player.stop();
            }

            const embed = createEmbed('secondary', 
                `${interaction.client.config.emojis.skip} Song Skipped`, 
                currentSong ? `Skipped **${currentSong.title}**` : 'Skipped current song'
            );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Skip command error:', error);
            await interaction.reply({
                embeds: [createEmbed('error', 'Skip Error', 'An error occurred while trying to skip the song.')],
                flags: 64
            });
        }
    }
};
