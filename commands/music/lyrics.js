const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Get lyrics for the current song or search for lyrics')
        .addStringOption(option =>
            option.setName('song')
                .setDescription('Song to search lyrics for (leave empty for current song)')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            let songTitle;
            const searchQuery = interaction.options.getString('song');
            
            if (searchQuery) {
                songTitle = searchQuery;
            } else {
                // Get current playing song
                const queue = interaction.client.musicQueues.get(interaction.guild.id);
                
                if (!queue || !queue.playing || !queue.songs[0]) {
                    return interaction.editReply({
                        embeds: [createEmbed('warning', 'No Song Playing', 'There is no music currently playing! Please specify a song to search for.')]
                    });
                }
                
                songTitle = queue.songs[0].title;
            }

            // Clean up the song title (remove [Official Video], (Official Audio), etc.)
            const cleanTitle = songTitle
                .replace(/\[.*?\]/g, '')
                .replace(/\(.*?\)/g, '')
                .replace(/official|video|audio|lyric|lyrics/gi, '')
                .trim();

            // Note: In a production environment, you would integrate with a lyrics API like:
            // - Genius API
            // - Musixmatch API
            // - AZLyrics (with proper scraping)
            // - LyricFind API

            const embed = new EmbedBuilder()
                .setColor(interaction.client.config.colors.primary)
                .setTitle(`${interaction.client.config.emojis.music} Lyrics Search`)
                .setDescription(`**Searching for:** ${cleanTitle}`)
                .addFields({
                    name: 'Feature Coming Soon',
                    value: 'Lyrics integration is currently in development. This feature will be available in a future update with support for multiple lyrics providers.',
                    inline: false
                })
                .addFields({
                    name: 'Suggested Lyrics Sources',
                    value: '• [Genius](https://genius.com)\n• [AZLyrics](https://www.azlyrics.com)\n• [LyricFind](https://www.lyricfind.com)\n• [Musixmatch](https://www.musixmatch.com)',
                    inline: false
                })
                .setFooter({ 
                    text: 'Angel Music Bot • Lyrics feature in development',
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setTimestamp();

            // If there's a current song, add its info
            if (!searchQuery) {
                const queue = interaction.client.musicQueues.get(interaction.guild.id);
                if (queue && queue.songs[0] && queue.songs[0].thumbnail) {
                    embed.setThumbnail(queue.songs[0].thumbnail);
                }
            }

            await interaction.editReply({ embeds: [embed] });

            // TODO: Implement actual lyrics fetching
            // Example implementation structure:
            /*
            try {
                const lyrics = await fetchLyricsFromAPI(cleanTitle);
                
                if (lyrics) {
                    // Split lyrics into chunks if too long for Discord
                    const maxLength = 4096;
                    if (lyrics.length > maxLength) {
                        const chunks = lyrics.match(/.{1,4000}/g);
                        
                        for (let i = 0; i < chunks.length && i < 3; i++) {
                            const lyricsEmbed = new EmbedBuilder()
                                .setColor(interaction.client.config.colors.primary)
                                .setTitle(i === 0 ? `🎵 Lyrics: ${cleanTitle}` : `🎵 Lyrics (Part ${i + 1})`)
                                .setDescription(chunks[i])
                                .setFooter({ text: `Page ${i + 1} of ${chunks.length}` });
                                
                            if (i === 0) {
                                await interaction.editReply({ embeds: [lyricsEmbed] });
                            } else {
                                await interaction.followUp({ embeds: [lyricsEmbed] });
                            }
                        }
                    } else {
                        const lyricsEmbed = new EmbedBuilder()
                            .setColor(interaction.client.config.colors.primary)
                            .setTitle(`🎵 Lyrics: ${cleanTitle}`)
                            .setDescription(lyrics);
                            
                        await interaction.editReply({ embeds: [lyricsEmbed] });
                    }
                } else {
                    // No lyrics found
                    await interaction.editReply({
                        embeds: [createEmbed('warning', 'No Lyrics Found', `Could not find lyrics for "${cleanTitle}"`)]
                    });
                }
            } catch (error) {
                await interaction.editReply({
                    embeds: [createEmbed('error', 'Lyrics Error', 'An error occurred while fetching lyrics.')]
                });
            }
            */

        } catch (error) {
            console.error('Lyrics command error:', error);
            const errorEmbed = createEmbed('error', 'Lyrics Error', 'An error occurred while searching for lyrics.');
            
            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};
