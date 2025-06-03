const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds.js');
const { checkPermissions } = require('../../utils/permissions.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('Toggle autoplay mode to automatically add similar songs when queue is empty')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Set autoplay mode')
                .setRequired(false)
                .addChoices(
                    { name: 'On', value: 'on' },
                    { name: 'Off', value: 'off' },
                    { name: 'Status', value: 'status' }
                )),

    async execute(interaction) {
        try {
            const mode = interaction.options.getString('mode');
            const queue = interaction.client.musicQueues.get(interaction.guild.id);

            if (!queue) {
                return interaction.reply({
                    embeds: [createEmbed('warning', 'No Music Queue', 'There is no active music queue in this server.')],
                    ephemeral: true
                });
            }

            // Check permissions for changing autoplay
            if (mode && mode !== 'status') {
                const hasPermission = await checkPermissions(interaction.member, 'dj') || 
                                     queue.voiceChannel.members.filter(member => !member.user.bot).size <= 1;
                
                if (!hasPermission) {
                    return interaction.reply({
                        embeds: [createEmbed('error', 'Permission Denied', 'You need DJ permissions to change autoplay settings!')],
                        flags: 64
                    });
                }
            }

            switch (mode) {
                case 'on':
                    queue.autoplay = true;
                    await interaction.reply({
                        embeds: [createEmbed('success', '🎵 Autoplay Enabled', 
                            'Autoplay is now **ON**. Similar songs will be automatically added when the queue is empty.')]
                    });
                    break;
                    
                case 'off':
                    queue.autoplay = false;
                    await interaction.reply({
                        embeds: [createEmbed('secondary', '⏹️ Autoplay Disabled', 
                            'Autoplay is now **OFF**. Music will stop when the queue is empty.')]
                    });
                    break;
                    
                case 'status':
                default:
                    const status = queue.autoplay ? 'ON' : 'OFF';
                    const statusEmoji = queue.autoplay ? '🎵' : '⏹️';
                    await interaction.reply({
                        embeds: [createEmbed('primary', `${statusEmoji} Autoplay Status`, 
                            `Autoplay is currently **${status}**\n\n` +
                            (queue.autoplay ? 
                                'Similar songs will be automatically added when the queue is empty.' : 
                                'Music will stop when the queue is empty.'))]
                    });
                    break;
            }

        } catch (error) {
            console.error('Autoplay command error:', error);
            await interaction.reply({
                embeds: [createEmbed('error', 'Command Error', 'An error occurred while processing the autoplay command.')],
                ephemeral: true
            });
        }
    }
};