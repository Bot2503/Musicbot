const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require('discord.js');
const { createEmbed } = require('../../utils/embeds.js');
const { formatDuration } = require('../../utils/formatters.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Display bot statistics and information'),

    async execute(interaction) {
        try {
            const client = interaction.client;
            
            // Calculate uptime
            const uptime = Date.now() - client.startTime;
            
            // Get memory usage
            const memoryUsage = process.memoryUsage();
            const memoryUsed = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
            const memoryTotal = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
            
            // Count active music sessions
            const activeSessions = client.musicQueues.size;
            const totalSongsQueued = Array.from(client.musicQueues.values())
                .reduce((total, queue) => total + queue.songs.length, 0);
            
            // Get bot info
            const ping = client.ws.ping;
            const guildCount = client.guilds.cache.size;
            const userCount = client.guilds.cache.reduce((total, guild) => total + guild.memberCount, 0);
            
            const embed = new EmbedBuilder()
                .setColor(client.config.colors.primary)
                .setTitle('📊 Angel Music Bot Statistics')
                .setDescription('Here are my current statistics and system information')
                .addFields(
                    {
                        name: '🤖 Bot Information',
                        value: `**Bot Name:** ${client.user.username}\n` +
                               `**Bot ID:** ${client.user.id}\n` +
                               `**Uptime:** ${formatDuration(Math.floor(uptime / 1000))}\n` +
                               `**Ping:** ${ping}ms`,
                        inline: true
                    },
                    {
                        name: '📈 Usage Statistics',
                        value: `**Servers:** ${guildCount.toLocaleString()}\n` +
                               `**Users:** ${userCount.toLocaleString()}\n` +
                               `**Active Sessions:** ${activeSessions}\n` +
                               `**Songs in Queues:** ${totalSongsQueued}`,
                        inline: true
                    },
                    {
                        name: '💾 System Information',
                        value: `**Memory Usage:** ${memoryUsed}MB / ${memoryTotal}MB\n` +
                               `**Node.js:** ${process.version}\n` +
                               `**Discord.js:** v${djsVersion}\n` +
                               `**Platform:** ${process.platform}`,
                        inline: true
                    }
                )
                .setFooter({ 
                    text: `Requested by ${interaction.user.username}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setThumbnail(client.user.displayAvatarURL())
                .setTimestamp();

            // Add music statistics if there are active sessions
            if (activeSessions > 0) {
                const playingSessions = Array.from(client.musicQueues.values())
                    .filter(queue => queue.playing).length;
                
                const totalDuration = Array.from(client.musicQueues.values())
                    .reduce((total, queue) => {
                        return total + queue.songs.reduce((queueTotal, song) => 
                            queueTotal + (song.duration || 0), 0);
                    }, 0);

                embed.addFields({
                    name: '🎵 Music Statistics',
                    value: `**Playing Now:** ${playingSessions} session${playingSessions !== 1 ? 's' : ''}\n` +
                           `**Total Queue Time:** ${formatDuration(totalDuration)}\n` +
                           `**Average Queue Size:** ${Math.round(totalSongsQueued / activeSessions * 10) / 10} songs`,
                    inline: false
                });
            }

            // Add performance indicators
            const performanceColor = ping < 100 ? '🟢' : ping < 200 ? '🟡' : '🔴';
            const memoryPercentage = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);
            const memoryColor = memoryPercentage < 70 ? '🟢' : memoryPercentage < 85 ? '🟡' : '🔴';

            embed.addFields({
                name: '⚡ Performance Status',
                value: `**Latency:** ${performanceColor} ${ping}ms\n` +
                       `**Memory Usage:** ${memoryColor} ${memoryPercentage}%\n` +
                       `**Status:** ${activeSessions === 0 ? '💤 Idle' : '🎵 Active'}`,
                inline: true
            });

            // Add links and information
            embed.addFields({
                name: '🔗 Links & Support',
                value: '**Created by:** Angel Music Team\n' +
                       '**Version:** 1.0.0\n' +
                       '**Support:** Use `/help` for assistance',
                inline: true
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Stats command error:', error);
            await interaction.reply({
                embeds: [createEmbed('error', 'Stats Error', 'An error occurred while retrieving bot statistics.')],
                ephemeral: true
            });
        }
    }
};
