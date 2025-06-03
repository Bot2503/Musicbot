const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds.js');
const { formatDuration } = require('../../utils/formatters.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the current music queue')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number to view')
                .setMinValue(1)
        ),

    async execute(interaction) {
        try {
            const queue = interaction.client.musicQueues.get(interaction.guild.id);

            if (!queue || queue.songs.length === 0) {
                return interaction.reply({
                    embeds: [createEmbed('warning', 'Empty Queue', 'The music queue is currently empty.\nUse `/play` to add some music!')],
                    ephemeral: true
                });
            }

            const page = interaction.options.getInteger('page') || 1;
            const songsPerPage = 10;
            const totalPages = Math.ceil(queue.songs.length / songsPerPage);

            if (page > totalPages) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Invalid Page', `Page ${page} doesn't exist. There are only ${totalPages} page(s).`)],
                    ephemeral: true
                });
            }

            const startIndex = (page - 1) * songsPerPage;
            const endIndex = startIndex + songsPerPage;
            const songsToShow = queue.songs.slice(startIndex, endIndex);

            // Calculate total queue duration
            const totalDuration = queue.songs.reduce((total, song) => total + (song.duration || 0), 0);

            // Create queue embed
            const embed = new EmbedBuilder()
                .setColor(interaction.client.config.colors.primary)
                .setTitle(`${interaction.client.config.emojis.queue} Music Queue`)
                .setDescription(`**Total songs:** ${queue.songs.length}\n**Total duration:** ${formatDuration(totalDuration)}\n**Loop:** ${queue.loop ? 'Single' : queue.loopQueue ? 'Queue' : 'Off'}\n\n`)
                .setFooter({ 
                    text: `Page ${page} of ${totalPages} • Volume: ${queue.volume}%`,
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setTimestamp();

            // Add current song (if playing)
            if (queue.playing && queue.songs[0]) {
                const currentSong = queue.songs[0];
                embed.addFields({
                    name: `${interaction.client.config.emojis.play} Now Playing`,
                    value: `**[${currentSong.title}](${currentSong.url})**\n` +
                           `Duration: ${formatDuration(currentSong.duration)} | Requested by: ${currentSong.requestedBy}`,
                    inline: false
                });
            }

            // Add upcoming songs
            if (songsToShow.length > 1 || (!queue.playing && songsToShow.length > 0)) {
                const upcomingStart = queue.playing ? 1 : 0;
                const upcoming = songsToShow.slice(upcomingStart).map((song, index) => {
                    const position = startIndex + upcomingStart + index + 1;
                    return `**${position}.** [${song.title.length > 50 ? song.title.substring(0, 50) + '...' : song.title}](${song.url})\n` +
                           `${formatDuration(song.duration)} | ${song.requestedBy}`;
                }).join('\n\n');

                if (upcoming) {
                    embed.addFields({
                        name: `${interaction.client.config.emojis.music} Up Next`,
                        value: upcoming.length > 1024 ? upcoming.substring(0, 1021) + '...' : upcoming,
                        inline: false
                    });
                }
            }

            // Set thumbnail if current song has one
            if (queue.songs[0]?.thumbnail) {
                embed.setThumbnail(queue.songs[0].thumbnail);
            }

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Queue command error:', error);
            await interaction.reply({
                embeds: [createEmbed('error', 'Queue Error', 'An error occurred while retrieving the queue.')],
                ephemeral: true
            });
        }
    }
};
