const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds.js');
const { checkPermissions } = require('../../utils/permissions.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Set or view the current volume')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Volume level (1-200)')
                .setMinValue(1)
                .setMaxValue(200)
        ),

    async execute(interaction) {
        try {
            const queue = interaction.client.musicQueues.get(interaction.guild.id);
            const volumeLevel = interaction.options.getInteger('level');

            // If no volume level provided, show current volume
            if (!volumeLevel) {
                if (!queue) {
                    return interaction.reply({
                        embeds: [createEmbed('warning', 'No Active Queue', 'There is no active music queue.')],
                        ephemeral: true
                    });
                }

                const volumeEmoji = queue.volume === 0 ? interaction.client.config.emojis.volumeMute : 
                                  queue.volume <= 33 ? '🔈' :
                                  queue.volume <= 66 ? '🔉' : interaction.client.config.emojis.volume;

                return interaction.reply({
                    embeds: [createEmbed('primary', `${volumeEmoji} Current Volume`, `Volume is set to **${queue.volume}%**`)]
                });
            }

            // Check if user is in the same voice channel
            const voiceChannel = interaction.member.voice.channel;
            
            if (!voiceChannel) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Voice Channel Required', 'You need to be in a voice channel to change the volume!')],
                    ephemeral: true
                });
            }

            if (!queue) {
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
                    embeds: [createEmbed('error', 'Permission Denied', 'You need DJ permissions to change the volume!')],
                    ephemeral: true
                });
            }

            // Set the new volume
            const oldVolume = queue.volume;
            queue.volume = volumeLevel;

            // Apply volume to current audio resource if playing
            if (queue.player && queue.player.state.resource && queue.player.state.resource.volume) {
                queue.player.state.resource.volume.setVolume(volumeLevel / 100);
            }

            // Determine volume emoji
            const volumeEmoji = volumeLevel === 0 ? interaction.client.config.emojis.volumeMute : 
                              volumeLevel <= 33 ? '🔈' :
                              volumeLevel <= 66 ? '🔉' : interaction.client.config.emojis.volume;

            // Create embed with volume change info
            const embed = createEmbed('secondary', 
                `${volumeEmoji} Volume Changed`, 
                `Volume changed from **${oldVolume}%** to **${volumeLevel}%**`
            );

            // Add warning for high volume
            if (volumeLevel > 100) {
                embed.addFields({
                    name: `${interaction.client.config.emojis.warning} High Volume Warning`,
                    value: 'Volume is set above 100%. This may cause audio distortion.',
                    inline: false
                });
            }

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Volume command error:', error);
            await interaction.reply({
                embeds: [createEmbed('error', 'Volume Error', 'An error occurred while changing the volume.')],
                ephemeral: true
            });
        }
    }
};
