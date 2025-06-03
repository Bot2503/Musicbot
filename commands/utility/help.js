const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help information for Angel Music Bot')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Help category to display')
                .addChoices(
                    { name: 'Music Commands', value: 'music' },
                    { name: 'Utility Commands', value: 'utility' },
                    { name: 'Getting Started', value: 'getting-started' },
                    { name: 'Permissions', value: 'permissions' }
                )
        ),

    async execute(interaction) {
        try {
            const category = interaction.options.getString('category');

            if (category) {
                // Show specific category
                await this.showCategory(interaction, category);
            } else {
                // Show main help menu
                await this.showMainHelp(interaction);
            }

        } catch (error) {
            console.error('Help command error:', error);
            await interaction.reply({
                embeds: [createEmbed('error', 'Help Error', 'An error occurred while displaying help information.')],
                ephemeral: true
            });
        }
    },

    async showMainHelp(interaction) {
        const embed = new EmbedBuilder()
            .setColor(interaction.client.config.colors.primary)
            .setTitle('🎵 Angel Music Bot - Help')
            .setDescription('Welcome to Angel Music Bot! Here\'s everything you need to know to get started.')
            .addFields(
                {
                    name: '🎶 Music Commands',
                    value: '`/play` - Play music from YouTube\n`/skip` - Skip current song\n`/pause` - Pause playback\n`/resume` - Resume playback\n`/stop` - Stop music and clear queue',
                    inline: true
                },
                {
                    name: '📋 Queue Management',
                    value: '`/queue` - View music queue\n`/remove` - Remove song from queue\n`/shuffle` - Shuffle the queue\n`/loop` - Toggle loop modes',
                    inline: true
                },
                {
                    name: '🔧 Controls',
                    value: '`/volume` - Adjust volume\n`/nowplaying` - Current song info\n`/seek` - Seek to time\n`/lyrics` - Get song lyrics',
                    inline: true
                },
                {
                    name: '🛠️ Utility',
                    value: '`/help` - This help menu\n`/stats` - Bot statistics',
                    inline: true
                },
                {
                    name: '🎯 Quick Start',
                    value: '1. Join a voice channel\n2. Use `/play <YouTube URL>` to start\n3. Use interactive buttons to control playback',
                    inline: false
                },
                {
                    name: '🔒 Permissions',
                    value: 'Most commands require you to be in the same voice channel. Some commands require DJ permissions (Manage Channels or Move Members).',
                    inline: false
                }
            )
            .setFooter({ 
                text: 'Use /help <category> for detailed information',
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setTimestamp();

        // Create dropdown menu for categories
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category')
            .setPlaceholder('Select a category for detailed help')
            .addOptions([
                {
                    label: 'Music Commands',
                    description: 'Detailed music playback commands',
                    value: 'music',
                    emoji: '🎶'
                },
                {
                    label: 'Utility Commands',
                    description: 'Bot utility and information commands',
                    value: 'utility',
                    emoji: '🛠️'
                },
                {
                    label: 'Getting Started',
                    description: 'How to use the bot for beginners',
                    value: 'getting-started',
                    emoji: '🎯'
                },
                {
                    label: 'Permissions',
                    description: 'Understanding bot permissions',
                    value: 'permissions',
                    emoji: '🔒'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({ 
            embeds: [embed], 
            components: [row] 
        });
    },

    async showCategory(interaction, category) {
        let embed;

        switch (category) {
            case 'music':
                embed = new EmbedBuilder()
                    .setColor(interaction.client.config.colors.secondary)
                    .setTitle('🎶 Music Commands')
                    .setDescription('Complete list of music playback commands')
                    .addFields(
                        {
                            name: '/play <query>',
                            value: 'Play music from YouTube URL\n**Usage:** `/play https://youtube.com/watch?v=...`',
                            inline: false
                        },
                        {
                            name: '/skip',
                            value: 'Skip the current song and play the next one in queue',
                            inline: true
                        },
                        {
                            name: '/stop',
                            value: 'Stop playback, clear queue, and disconnect bot',
                            inline: true
                        },
                        {
                            name: '/pause',
                            value: 'Pause the current song',
                            inline: true
                        },
                        {
                            name: '/resume',
                            value: 'Resume paused song',
                            inline: true
                        },
                        {
                            name: '/queue [page]',
                            value: 'View the music queue (10 songs per page)',
                            inline: true
                        },
                        {
                            name: '/nowplaying',
                            value: 'Show detailed info about current song with controls',
                            inline: true
                        },
                        {
                            name: '/volume [level]',
                            value: 'Set volume (1-200%) or view current volume',
                            inline: true
                        },
                        {
                            name: '/loop [mode]',
                            value: 'Toggle between Off/Single/Queue loop modes',
                            inline: true
                        },
                        {
                            name: '/shuffle',
                            value: 'Randomly reorder songs in queue',
                            inline: true
                        },
                        {
                            name: '/remove <position>',
                            value: 'Remove song at specified queue position',
                            inline: true
                        },
                        {
                            name: '/seek <time>',
                            value: 'Seek to specific time (e.g., 1:30, 90s)',
                            inline: true
                        },
                        {
                            name: '/lyrics [song]',
                            value: 'Get lyrics for current or specified song',
                            inline: true
                        }
                    );
                break;

            case 'utility':
                embed = new EmbedBuilder()
                    .setColor(interaction.client.config.colors.accent)
                    .setTitle('🛠️ Utility Commands')
                    .setDescription('Bot information and utility commands')
                    .addFields(
                        {
                            name: '/help [category]',
                            value: 'Show this help menu or specific category help\n**Categories:** music, utility, getting-started, permissions',
                            inline: false
                        },
                        {
                            name: '/stats',
                            value: 'Display bot statistics including uptime, memory usage, and server count',
                            inline: false
                        }
                    );
                break;

            case 'getting-started':
                embed = new EmbedBuilder()
                    .setColor(interaction.client.config.colors.primary)
                    .setTitle('🎯 Getting Started')
                    .setDescription('Quick start guide for new users')
                    .addFields(
                        {
                            name: 'Step 1: Join Voice Channel',
                            value: 'Join any voice channel in your server where you want music to play.',
                            inline: false
                        },
                        {
                            name: 'Step 2: Play Music',
                            value: 'Use `/play` with a YouTube URL to start playing music.\n**Example:** `/play https://youtube.com/watch?v=dQw4w9WgXcQ`',
                            inline: false
                        },
                        {
                            name: 'Step 3: Use Controls',
                            value: 'Use the interactive buttons that appear with each song, or use slash commands for more control.',
                            inline: false
                        },
                        {
                            name: '🎵 Interactive Controls',
                            value: '• **Pause Button** - Pause/resume playback\n• **Skip Button** - Skip to next song\n• **Stop Button** - Stop music and clear queue',
                            inline: false
                        },
                        {
                            name: '📋 Managing Your Queue',
                            value: '• Add more songs with `/play`\n• View queue with `/queue`\n• Remove songs with `/remove`\n• Shuffle with `/shuffle`',
                            inline: false
                        },
                        {
                            name: '⚠️ Important Notes',
                            value: '• Bot will auto-disconnect after 5 minutes of inactivity\n• You must be in the same voice channel as the bot to use commands\n• Some commands require DJ permissions',
                            inline: false
                        }
                    );
                break;

            case 'permissions':
                embed = new EmbedBuilder()
                    .setColor(interaction.client.config.colors.error)
                    .setTitle('🔒 Bot Permissions')
                    .setDescription('Understanding permission requirements')
                    .addFields(
                        {
                            name: 'Basic Requirements',
                            value: '• You must be in a voice channel\n• Bot needs "Connect" and "Speak" permissions in voice channel\n• Bot needs "Send Messages" and "Use Slash Commands" in text channel',
                            inline: false
                        },
                        {
                            name: 'DJ Permissions',
                            value: 'Some commands require DJ permissions:\n• **Manage Channels** permission\n• **Move Members** permission\n• Being alone with the bot in voice channel',
                            inline: false
                        },
                        {
                            name: 'Commands Requiring DJ Permissions',
                            value: '• `/stop` - Stop music completely\n• `/volume` - Change volume\n• `/loop` - Change loop mode\n• `/shuffle` - Shuffle queue\n• `/skip`* - Skip others\' songs\n• `/pause`* - Pause others\' songs',
                            inline: false
                        },
                        {
                            name: 'Song Requester Permissions',
                            value: 'You can always control songs you requested:\n• Skip your own songs\n• Pause/resume your songs\n• Remove your own songs from queue',
                            inline: false
                        },
                        {
                            name: 'Auto-Permissions',
                            value: 'If you\'re alone with the bot in a voice channel, you automatically have DJ permissions for that session.',
                            inline: false
                        }
                    )
                    .setFooter({ text: '* Exceptions apply for song requesters' });
                break;

            default:
                return this.showMainHelp(interaction);
        }

        embed.setFooter({ 
            text: 'Use /help to return to main menu',
            iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
