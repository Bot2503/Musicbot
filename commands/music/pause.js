const { SlashCommandBuilder } = require('discord.js');
const { AudioPlayerStatus } = require('@discordjs/voice');
const { createEmbed } = require('../../utils/embeds.js');
const { checkPermissions } = require('../../utils/permissions.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the current song'),

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

            // Check if already paused
            if (queue.player.state.status === AudioPlayerStatus.Paused) {
                return interaction.reply({
                    embeds: [createEmbed('warning', 'Already Paused', 'The music is already paused! Use `/resume` to continue.')],
                    ephemeral: true
                });
            }

            // Check if user has DJ permissions or if they're the only one in voice channel
            const hasPermission = await checkPermissions(interaction.member, 'dj') || 
                                 queue.voiceChannel.members.filter(member => !member.user.bot).size <= 1;

            if (!hasPermission && queue.songs[0]?.requestedBy?.id !== interaction.user.id) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Permission Denied', 'You need DJ permissions or be the song requester to pause!')],
                    ephemeral: true
                });
            }

            // Pause the player
            queue.player.pause();

            const currentSong = queue.songs[0];
            const embed = createEmbed('accent', 
                `${interaction.client.config.emojis.pause} Music Paused`, 
                currentSong ? `Paused **${currentSong.title}**\nUse \`/resume\` to continue playing.` : 'Music paused'
            );

            if (currentSong?.thumbnail) {
                embed.setThumbnail(currentSong.thumbnail);
            }

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Pause command error:', error);
            await interaction.reply({
                embeds: [createEmbed('error', 'Pause Error', 'An error occurred while trying to pause the music.')],
                ephemeral: true
            });
        }
    }
};
