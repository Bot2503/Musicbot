const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds.js');
const { checkPermissions } = require('../../utils/permissions.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Toggle loop mode')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Loop mode to set')
                .setRequired(false)
                .addChoices(
                    { name: 'Off', value: 'off' },
                    { name: 'Single Song', value: 'single' },
                    { name: 'Queue', value: 'queue' }
                )
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

            if (!hasPermission) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Permission Denied', 'You need DJ permissions to change loop mode!')],
                    ephemeral: true
                });
            }

            const mode = interaction.options.getString('mode');
            let newMode, emoji, description;

            if (mode) {
                // Set specific mode
                switch (mode) {
                    case 'off':
                        queue.loop = false;
                        queue.loopQueue = false;
                        newMode = 'Off';
                        emoji = '➡️';
                        description = 'Loop mode disabled. Songs will play once.';
                        break;
                    case 'single':
                        queue.loop = true;
                        queue.loopQueue = false;
                        newMode = 'Single Song';
                        emoji = interaction.client.config.emojis.repeatOne;
                        description = 'Current song will repeat until loop is disabled.';
                        break;
                    case 'queue':
                        queue.loop = false;
                        queue.loopQueue = true;
                        newMode = 'Queue';
                        emoji = interaction.client.config.emojis.repeat;
                        description = 'The entire queue will repeat when it reaches the end.';
                        break;
                }
            } else {
                // Toggle through modes
                if (!queue.loop && !queue.loopQueue) {
                    // Off -> Single
                    queue.loop = true;
                    queue.loopQueue = false;
                    newMode = 'Single Song';
                    emoji = interaction.client.config.emojis.repeatOne;
                    description = 'Current song will repeat until loop is disabled.';
                } else if (queue.loop && !queue.loopQueue) {
                    // Single -> Queue
                    queue.loop = false;
                    queue.loopQueue = true;
                    newMode = 'Queue';
                    emoji = interaction.client.config.emojis.repeat;
                    description = 'The entire queue will repeat when it reaches the end.';
                } else {
                    // Queue -> Off
                    queue.loop = false;
                    queue.loopQueue = false;
                    newMode = 'Off';
                    emoji = '➡️';
                    description = 'Loop mode disabled. Songs will play once.';
                }
            }

            const embed = createEmbed('secondary', 
                `${emoji} Loop Mode: ${newMode}`, 
                description
            );

            // Add current song info if available
            if (queue.songs[0]) {
                embed.addFields({
                    name: 'Current Song',
                    value: `**${queue.songs[0].title}**`,
                    inline: true
                });
            }

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Loop command error:', error);
            await interaction.reply({
                embeds: [createEmbed('error', 'Loop Error', 'An error occurred while changing the loop mode.')],
                ephemeral: true
            });
        }
    }
};
