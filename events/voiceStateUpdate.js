const { Events } = require('discord.js');
const { createEmbed } = require('../utils/embeds.js');

module.exports = {
    name: Events.VoiceStateUpdate,

    async execute(oldState, newState, client) {
        try {
            // Handle bot being disconnected
            if (oldState.id === client.user.id) {
                await handleBotVoiceStateChange(oldState, newState, client);
                return;
            }

            // Handle user voice state changes
            await handleUserVoiceStateChange(oldState, newState, client);

        } catch (error) {
            console.error('Voice state update error:', error);
        }
    }
};

/**
 * Handle bot voice state changes
 */
async function handleBotVoiceStateChange(oldState, newState, client) {
    const guild = oldState.guild || newState.guild;
    const queue = client.musicQueues.get(guild.id);

    if (!queue) return;

    // Bot was disconnected from voice channel
    if (oldState.channelId && !newState.channelId) {
        console.log(`🔌 Bot disconnected from voice channel in ${guild.name}`);

        // Clean up the queue
        if (queue.timeout) {
            clearTimeout(queue.timeout);
        }

        if (queue.player) {
            queue.player.stop();
        }

        if (queue.connection) {
            queue.connection.destroy();
        }

        // Remove queue from memory
        client.musicQueues.delete(guild.id);

        // Notify text channel if possible
        if (queue.textChannel) {
            try {
                const embed = createEmbed('warning', 
                    `${client.config.emojis.warning} Disconnected`, 
                    'I was disconnected from the voice channel. Music session ended.'
                );
                await queue.textChannel.send({ embeds: [embed] });
            } catch (error) {
                console.error('Failed to send disconnect message:', error);
            }
        }
    }

    // Bot was moved to a different channel
    else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        console.log(`📍 Bot moved to different voice channel in ${guild.name}`);

        // Update queue voice channel reference
        queue.voiceChannel = newState.channel;

        // Notify text channel
        if (queue.textChannel) {
            try {
                const embed = createEmbed('secondary', 
                    `${client.config.emojis.success} Channel Changed`, 
                    `Moved to **${newState.channel.name}**. Music continues playing.`
                );
                await queue.textChannel.send({ embeds: [embed] });
            } catch (error) {
                console.error('Failed to send move message:', error);
            }
        }
    }
}

/**
 * Handle user voice state changes
 */
async function handleUserVoiceStateChange(oldState, newState, client) {
    const guild = oldState.guild || newState.guild;
    const queue = client.musicQueues.get(guild.id);

    if (!queue || !queue.voiceChannel) return;

    // Check if the change affects the bot's voice channel
    const botChannel = queue.voiceChannel;
    const affectsBotChannel = oldState.channelId === botChannel.id || newState.channelId === botChannel.id;

    if (!affectsBotChannel) return;

    // Get current members in bot's voice channel (excluding bots)
    const membersInChannel = botChannel.members.filter(member => !member.user.bot);

    // If no users left in voice channel, start disconnect timer
    if (membersInChannel.size === 0) {
        console.log(`👥 All users left voice channel in ${guild.name}, starting disconnect timer`);

        // Clear any existing timeout
        if (queue.timeout) {
            clearTimeout(queue.timeout);
        }

        // Set new timeout for auto-disconnect
        queue.timeout = setTimeout(async () => {
            // Double-check that channel is still empty
            const currentMembers = botChannel.members.filter(member => !member.user.bot);

            if (currentMembers.size === 0) {
                console.log(`⏰ Auto-disconnecting from empty voice channel in ${guild.name}`);

                // Stop music and disconnect
                queue.songs = [];
                queue.playing = false;

                if (queue.player) {
                    queue.player.stop();
                }

                if (queue.connection) {
                    queue.connection.destroy();
                }

                // Notify text channel
                if (queue.textChannel) {
                    try {
                        const embed = createEmbed('warning', 
                            `${client.config.emojis.warning} Auto-Disconnect`, 
                            'Left voice channel due to inactivity (no users for 5 minutes).'
                        );
                        await queue.textChannel.send({ embeds: [embed] });
                    } catch (error) {
                        console.error('Failed to send auto-disconnect message:', error);
                    }
                }

                // Remove queue from memory
                client.musicQueues.delete(guild.id);
            }
        }, client.config.autoDisconnectTime);
    }

    // If users joined back, cancel disconnect timer
    else if (membersInChannel.size > 0 && queue.timeout) {
        console.log(`👥 Users joined back in voice channel in ${guild.name}, canceling disconnect timer`);
        clearTimeout(queue.timeout);
        queue.timeout = null;
    }

    // Handle specific user actions
    const member = oldState.member || newState.member;

    // User joined the bot's voice channel
    if (!oldState.channelId && newState.channelId === botChannel.id) {
        console.log(`👋 ${member.user.tag} joined voice channel in ${guild.name}`);

        // Cancel auto-disconnect if running
        if (queue.timeout) {
            clearTimeout(queue.timeout);
            queue.timeout = null;
        }
    }

    // User left the bot's voice channel
    else if (oldState.channelId === botChannel.id && !newState.channelId) {
        console.log(`👋 ${member.user.tag} left voice channel in ${guild.name}`);

        // If this was the last user, the timeout logic above will handle it
    }

    // User moved from bot's channel to another channel
    else if (oldState.channelId === botChannel.id && newState.channelId && newState.channelId !== botChannel.id) {
        console.log(`📍 ${member.user.tag} moved away from bot's voice channel in ${guild.name}`);

        // The empty channel logic above will handle auto-disconnect if needed
    }

    // User moved to bot's channel from another channel
    else if (oldState.channelId && oldState.channelId !== botChannel.id && newState.channelId === botChannel.id) {
        console.log(`📍 ${member.user.tag} moved to bot's voice channel in ${guild.name}`);

        // Cancel auto-disconnect if running
        if (queue.timeout) {
            clearTimeout(queue.timeout);
            queue.timeout = null;
        }
    }
}
// Events already imported above

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        try {
            const guild = newState.guild;
            const queue = newState.client.musicQueues.get(guild.id);

            if (!queue || !queue.connection) return;

            // Get the bot's voice channel
            const botVoiceChannel = guild.members.me?.voice?.channel;
            if (!botVoiceChannel) return;

            // Count non-bot members in the voice channel
            const membersInChannel = botVoiceChannel.members.filter(member => !member.user.bot).size;

            // If bot is alone and not in 24/7 mode
            if (membersInChannel === 0 && !queue.mode247) {
                // Set a timeout to leave if still alone after 30 seconds
                setTimeout(() => {
                    const currentQueue = newState.client.musicQueues.get(guild.id);
                    if (!currentQueue) return;

                    const currentBotChannel = guild.members.me?.voice?.channel;
                    if (!currentBotChannel) return;

                    const currentMembersInChannel = currentBotChannel.members.filter(member => !member.user.bot).size;

                    // If still alone and not in 24/7 mode, disconnect
                    if (currentMembersInChannel === 0 && !currentQueue.mode247) {
                        const musicPlayer = require('../handlers/musicPlayer.js');
                        if (musicPlayer.disconnect) {
                            musicPlayer.disconnect(currentQueue);
                        } else {
                            // Fallback if musicPlayer is a class
                            currentQueue.connection?.destroy();
                            newState.client.musicQueues.delete(guild.id);
                        }

                        console.log(`Left voice channel in ${guild.name} - no members present`);
                    }
                }, 30000); // 30 seconds
            }

            // Handle 24/7 mode channel switching
            if (queue.mode247) {
                const guild247Settings = newState.client.guild247?.get(guild.id);

                // If user left the designated 24/7 channel, follow them if they're a DJ
                if (oldState.channelId === guild247Settings?.channelId && 
                    newState.channelId && 
                    newState.channelId !== oldState.channelId) {

                    // Check if the user has DJ permissions
                    const { checkPermissions } = require('../utils/permissions.js');
                    const hasDJPermission = await checkPermissions(newState.member, 'dj');

                    if (hasDJPermission) {
                        // Move bot to new channel
                        try {
                            const { joinVoiceChannel } = require('@discordjs/voice');

                            const newConnection = joinVoiceChannel({
                                channelId: newState.channelId,
                                guildId: guild.id,
                                adapterCreator: guild.voiceAdapterCreator,
                            });

                            // Update queue connection
                            queue.connection = newConnection;
                            queue.voiceChannel = newState.channel;
                            newConnection.subscribe(queue.player);

                            // Update 24/7 settings
                            guild247Settings.channelId = newState.channelId;
                            newState.client.guild247.set(guild.id, guild247Settings);

                            console.log(`24/7 mode: Followed DJ to ${newState.channel.name}`);
                        } catch (error) {
                            console.error('Error following DJ in 24/7 mode:', error);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Voice state update error:', error);
        }
    }
};