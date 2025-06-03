const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds.js');
const { checkPermissions } = require('../../utils/permissions.js');
const { formatDuration, parseTimeString } = require('../../utils/formatters.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('Seek to a specific time in the current song')
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Time to seek to (e.g., 1:30, 90s, 2m30s)')
                .setRequired(true)
        ),

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

            if (!queue || !queue.playing || !queue.songs[0]) {
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

            if (!hasPermission && queue.songs[0]?.requestedBy?.id !== interaction.user.id) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Permission Denied', 'You need DJ permissions or be the song requester to seek!')],
                    ephemeral: true
                });
            }

            const timeString = interaction.options.getString('time');
            const seekSeconds = parseTimeString(timeString);

            if (seekSeconds === null) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Invalid Time Format', 'Please use a valid time format (e.g., 1:30, 90s, 2m30s)')],
                    ephemeral: true
                });
            }

            const currentSong = queue.songs[0];
            
            if (seekSeconds >= currentSong.duration) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Time Out of Range', `Cannot seek to ${formatDuration(seekSeconds)}. Song duration is ${formatDuration(currentSong.duration)}`)],
                    ephemeral: true
                });
            }

            if (seekSeconds < 0) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Invalid Time', 'Cannot seek to a negative time!')],
                    ephemeral: true
                });
            }

            // Note: Seeking with ytdl-core is limited. This is a simplified implementation.
            // In a production bot, you'd need more sophisticated audio handling or different libraries.
            await interaction.reply({
                embeds: [createEmbed('warning', 'Seek Limitation', 
                    `**Note:** Seeking functionality is limited with the current audio backend.\n\n` +
                    `**Requested seek time:** ${formatDuration(seekSeconds)}\n` +
                    `**Current song:** ${currentSong.title}\n` +
                    `**Song duration:** ${formatDuration(currentSong.duration)}\n\n` +
                    `*This feature will be enhanced in future updates with better audio streaming support.*`
                )]
            });

            // TODO: Implement actual seeking when using a more advanced audio library
            // For now, we'll just show the limitation message

        } catch (error) {
            console.error('Seek command error:', error);
            await interaction.reply({
                embeds: [createEmbed('error', 'Seek Error', 'An error occurred while trying to seek in the song.')],
                ephemeral: true
            });
        }
    }
};
