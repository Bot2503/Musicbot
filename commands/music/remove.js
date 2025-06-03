const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds.js');
const { checkPermissions } = require('../../utils/permissions.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a song from the queue')
        .addIntegerOption(option =>
            option.setName('position')
                .setDescription('Position of the song to remove (1 = currently playing)')
                .setRequired(true)
                .setMinValue(1)
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

            if (!queue || queue.songs.length === 0) {
                return interaction.reply({
                    embeds: [createEmbed('warning', 'Empty Queue', 'The music queue is currently empty!')],
                    ephemeral: true
                });
            }

            if (voiceChannel !== queue.voiceChannel) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Wrong Voice Channel', 'You need to be in the same voice channel as the bot!')],
                    ephemeral: true
                });
            }

            const position = interaction.options.getInteger('position');
            
            if (position > queue.songs.length) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Invalid Position', `There are only ${queue.songs.length} song${queue.songs.length !== 1 ? 's' : ''} in the queue!`)],
                    ephemeral: true
                });
            }

            // Can't remove currently playing song (position 1)
            if (position === 1) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Cannot Remove Current Song', 'You cannot remove the currently playing song! Use `/skip` instead.')],
                    ephemeral: true
                });
            }

            const songToRemove = queue.songs[position - 1];
            
            // Check if user has DJ permissions, is the song requester, or is alone in voice channel
            const hasPermission = await checkPermissions(interaction.member, 'dj') || 
                                 songToRemove.requestedBy.id === interaction.user.id ||
                                 queue.voiceChannel.members.filter(member => !member.user.bot).size <= 1;

            if (!hasPermission) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Permission Denied', 'You can only remove songs you requested, or you need DJ permissions!')],
                    ephemeral: true
                });
            }

            // Remove the song from queue
            const removedSong = queue.songs.splice(position - 1, 1)[0];

            const embed = createEmbed('secondary', 
                `${interaction.client.config.emojis.success} Song Removed`, 
                `Removed **[${removedSong.title}](${removedSong.url})** from position ${position}\n\n` +
                `**Duration:** ${require('../../utils/formatters.js').formatDuration(removedSong.duration)}\n` +
                `**Requested by:** ${removedSong.requestedBy}\n` +
                `**Removed by:** ${interaction.user}\n\n` +
                `**Songs remaining:** ${queue.songs.length}`
            );

            if (removedSong.thumbnail) {
                embed.setThumbnail(removedSong.thumbnail);
            }

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Remove command error:', error);
            await interaction.reply({
                embeds: [createEmbed('error', 'Remove Error', 'An error occurred while removing the song from the queue.')],
                ephemeral: true
            });
        }
    }
};
