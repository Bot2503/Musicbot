const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds.js');
const { checkPermissions } = require('../../utils/permissions.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the music queue'),

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

            if (!queue || queue.songs.length <= 1) {
                return interaction.reply({
                    embeds: [createEmbed('warning', 'Not Enough Songs', 'There need to be at least 2 songs in the queue to shuffle!')],
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
                    embeds: [createEmbed('error', 'Permission Denied', 'You need DJ permissions to shuffle the queue!')],
                    ephemeral: true
                });
            }

            // Keep the current song (index 0) and shuffle the rest
            const currentSong = queue.songs[0];
            const remainingSongs = queue.songs.slice(1);
            
            // Fisher-Yates shuffle algorithm
            for (let i = remainingSongs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [remainingSongs[i], remainingSongs[j]] = [remainingSongs[j], remainingSongs[i]];
            }

            // Reconstruct the queue with current song first
            queue.songs = [currentSong, ...remainingSongs];

            const embed = createEmbed('secondary', 
                `${interaction.client.config.emojis.shuffle} Queue Shuffled`, 
                `Successfully shuffled **${remainingSongs.length}** song${remainingSongs.length !== 1 ? 's' : ''} in the queue!\n\n` +
                `**Current song:** ${currentSong.title}\n` +
                `**Total songs in queue:** ${queue.songs.length}`
            );

            // Add some preview of the new order
            if (remainingSongs.length > 0) {
                const nextSongs = remainingSongs.slice(0, 3).map((song, index) => {
                    return `**${index + 2}.** ${song.title.length > 40 ? song.title.substring(0, 40) + '...' : song.title}`;
                }).join('\n');

                embed.addFields({
                    name: 'Next Up',
                    value: nextSongs + (remainingSongs.length > 3 ? `\n*...and ${remainingSongs.length - 3} more*` : ''),
                    inline: false
                });
            }

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Shuffle command error:', error);
            await interaction.reply({
                embeds: [createEmbed('error', 'Shuffle Error', 'An error occurred while shuffling the queue.')],
                ephemeral: true
            });
        }
    }
};
