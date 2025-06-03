const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds.js');
const { checkPermissions } = require('../../utils/permissions.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('247')
        .setDescription('Toggle 24/7 mode to keep the bot in voice channel continuously')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Set 24/7 mode')
                .setRequired(false)
                .addChoices(
                    { name: 'On', value: 'on' },
                    { name: 'Off', value: 'off' },
                    { name: 'Status', value: 'status' }
                )),

    async execute(interaction) {
        try {
            const mode = interaction.options.getString('mode');
            const voiceChannel = interaction.member.voice.channel;

            // Check if user is in a voice channel for enabling 24/7
            if (mode === 'on' && !voiceChannel) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Voice Channel Required', 'You need to be in a voice channel to enable 24/7 mode.')],
                    ephemeral: true
                });
            }

            // Check permissions
            if (mode && mode !== 'status') {
                const hasPermission = await checkPermissions(interaction.member, 'dj');
                
                if (!hasPermission) {
                    return interaction.reply({
                        embeds: [createEmbed('error', 'Permission Denied', 'You need DJ permissions to change 24/7 mode!')],
                        ephemeral: true
                    });
                }
            }

            // Initialize or get 24/7 settings for guild
            if (!interaction.client.guild247) {
                interaction.client.guild247 = new Map();
            }

            const guildSettings = interaction.client.guild247.get(interaction.guild.id) || {
                enabled: false,
                channelId: null,
                textChannelId: interaction.channel.id
            };

            switch (mode) {
                case 'on':
                    guildSettings.enabled = true;
                    guildSettings.channelId = voiceChannel.id;
                    guildSettings.textChannelId = interaction.channel.id;
                    interaction.client.guild247.set(interaction.guild.id, guildSettings);

                    // Create or get existing queue
                    let queue = interaction.client.musicQueues.get(interaction.guild.id);
                    if (!queue) {
                        const { joinVoiceChannel, createAudioPlayer } = require('@discordjs/voice');
                        
                        const connection = joinVoiceChannel({
                            channelId: voiceChannel.id,
                            guildId: interaction.guild.id,
                            adapterCreator: interaction.guild.voiceAdapterCreator,
                        });

                        queue = {
                            guild: interaction.guild,
                            voiceChannel: voiceChannel,
                            textChannel: interaction.channel,
                            connection: connection,
                            player: createAudioPlayer(),
                            songs: [],
                            volume: 50,
                            loop: false,
                            loopQueue: false,
                            autoplay: true,
                            mode247: true
                        };

                        connection.subscribe(queue.player);
                        interaction.client.musicQueues.set(interaction.guild.id, queue);
                    } else {
                        queue.mode247 = true;
                        queue.autoplay = true;
                    }

                    await interaction.reply({
                        embeds: [createEmbed('success', '🔄 24/7 Mode Enabled', 
                            `24/7 mode is now **ON** in ${voiceChannel}\n\n` +
                            '• Bot will stay connected to voice channel\n' +
                            '• Autoplay is automatically enabled\n' +
                            '• Music will continue playing even when alone')]
                    });
                    break;
                    
                case 'off':
                    guildSettings.enabled = false;
                    interaction.client.guild247.set(interaction.guild.id, guildSettings);

                    queue = interaction.client.musicQueues.get(interaction.guild.id);
                    if (queue) {
                        queue.mode247 = false;
                    }

                    await interaction.reply({
                        embeds: [createEmbed('secondary', '⏹️ 24/7 Mode Disabled', 
                            '24/7 mode is now **OFF**\n\n' +
                            '• Bot will disconnect when alone\n' +
                            '• Normal auto-disconnect behavior restored')]
                    });
                    break;
                    
                case 'status':
                default:
                    const status = guildSettings.enabled ? 'ON' : 'OFF';
                    const statusEmoji = guildSettings.enabled ? '🔄' : '⏹️';
                    const channelName = guildSettings.channelId ? 
                        interaction.guild.channels.cache.get(guildSettings.channelId)?.name || 'Unknown Channel' : 
                        'None';

                    await interaction.reply({
                        embeds: [createEmbed('primary', `${statusEmoji} 24/7 Mode Status`, 
                            `24/7 mode is currently **${status}**\n\n` +
                            `**Voice Channel:** ${channelName}\n` +
                            `**Auto-disconnect:** ${guildSettings.enabled ? 'Disabled' : 'Enabled'}\n` +
                            `**Autoplay:** ${guildSettings.enabled ? 'Auto-enabled' : 'Manual control'}`)]
                    });
                    break;
            }

        } catch (error) {
            console.error('24/7 command error:', error);
            await interaction.reply({
                embeds: [createEmbed('error', 'Command Error', 'An error occurred while processing the 24/7 command.')],
                ephemeral: true
            });
        }
    }
};