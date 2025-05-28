
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all bot commands and useful information'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('🎵 Veko Music Bot - Help')
            .setDescription('Here are all available commands and useful information:')
            .addFields(
                {
                    name: '🎵 **Music Commands**',
                    value: `
                    \`/play <song>\` - Play music from YouTube, Spotify, etc.
                    \`/pause\` - Pause the current track
                    \`/resume\` - Resume the paused track
                    \`/skip\` - Skip to the next track
                    \`/stop\` - Stop playback and clear queue
                    \`/queue\` - Show the music queue
                    \`/nowplaying\` - Show current playing track
                    \`/volume <1-100>\` - Set playback volume
                    \`/loop\` - Toggle loop mode (requires vote)
                    \`/shuffle\` - Shuffle the queue
                    \`/seek <time>\` - Seek to specific time in track
                    \`/remove <position>\` - Remove track from queue
                    \`/lyrics\` - Get lyrics for current track
                    `,
                    inline: false
                },
                {
                    name: '🔧 **Utility Commands**',
                    value: `
                    \`/join\` - Join your voice channel
                    \`/leave\` - Leave voice channel
                    \`/playlist <url>\` - Play entire playlist
                    \`/247 <enable/disable>\` - Toggle 24/7 mode (requires vote)
                    \`/help\` - Show this help message
                    `,
                    inline: false
                },
                {
                    name: '🗳️ **Premium Features (Vote Required)**',
                    value: `
                    \`/247\` - 24/7 mode (requires top.gg vote)
                    \`/loop\` - Loop mode (requires top.gg vote)
                    
                    **Why vote?** Voting helps the bot grow and unlocks premium features!
                    Vote lasts 12 hours before you need to vote again.
                    `,
                    inline: false
                },
                {
                    name: '✨ **Features**',
                    value: `
                    • Support for YouTube, Spotify, SoundCloud
                    • High quality audio playback
                    • Auto-complete search suggestions
                    • Playlist support
                    • 24/7 mode for continuous music
                    • Smart queue management
                    • Auto-delete messages to keep chat clean
                    `,
                    inline: false
                },
                {
                    name: '📊 **Bot Statistics**',
                    value: `
                    **Servers:** ${interaction.client.guilds.cache.size}
                    **Users:** ${interaction.client.users.cache.size}
                    **Commands:** ${interaction.client.commands.size}
                    **Uptime:** <t:${Math.floor((Date.now() - interaction.client.uptime) / 1000)}:R>
                    `,
                    inline: false
                }
            )
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setFooter({ 
                text: `Requested by ${interaction.user.username}`, 
                iconURL: interaction.user.displayAvatarURL() 
            })
            .setTimestamp();

        // Create buttons for invite and support
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('📨 Invite Bot')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.com/api/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=3148800&scope=bot%20applications.commands`),
                new ButtonBuilder()
                    .setLabel('💬 Support Server')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.gg/w9M6YBWdSk'), // Thay bằng link Discord support của bạn
                new ButtonBuilder()
                    .setLabel('🌟 Rate Bot')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://top.gg/bot/' + interaction.client.user.id) // Thay bằng link top.gg nếu có
            );

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    }
};
