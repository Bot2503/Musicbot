const { Events, InteractionType, ComponentType } = require('discord.js');
const { createEmbed } = require('../utils/embeds.js');
const { checkPermissions, canControlSong } = require('../utils/permissions.js');

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction, client) {
        try {
            // Handle slash commands
            if (interaction.type === InteractionType.ApplicationCommand) {
                await handleSlashCommand(interaction, client);
            }

            // Handle button interactions
            else if (interaction.type === InteractionType.MessageComponent && interaction.componentType === ComponentType.Button) {
                // Handle progress buttons
                if (interaction.customId.startsWith('progress_')) {
                    const action = interaction.customId.replace('progress_', '');
                    const queue = client.musicQueues.get(interaction.guild.id);

                    if (!queue || !queue.playing) {
                        return interaction.reply({
                            embeds: [createEmbed('warning', 'Nothing Playing', 'There is no music currently playing!')],
                            ephemeral: true
                        });
                    }

                    switch (action) {
                        case 'refresh':
                            const currentSong = queue.songs[0];
                            const embed = createMusicEmbed(currentSong, 'Playing', queue);
                            await interaction.update({ embeds: [embed] });
                            break;

                        case 'auto':
                            // Toggle auto-update
                            if (queue.progressInterval) {
                                client.musicPlayer.stopProgressTracking(queue);
                                await interaction.reply({
                                    embeds: [createEmbed('success', 'Auto Update Disabled', 'Progress will no longer auto-update.')],
                                    ephemeral: true
                                });
                            } else {
                                queue.progressMessage = interaction.message;
                                client.musicPlayer.startProgressTracking(queue);
                                await interaction.reply({
                                    embeds: [createEmbed('success', 'Auto Update Enabled', 'Progress will update every 5 seconds.')],
                                    ephemeral: true
                                });
                            }
                            break;
                    }
                    return;
                }

                // Handle music control buttons
                if (interaction.customId.startsWith('music_')) {
                    const action = interaction.customId.replace('music_', '');

                    const queue = client.musicQueues.get(interaction.guild.id);
                    const voiceChannel = interaction.member.voice.channel;

                    // Check if user is in voice channel
                    if (!voiceChannel) {
                        return interaction.reply({
                            embeds: [createEmbed('error', 'Voice Channel Required', 'You need to be in a voice channel to use music controls!')],
                            flags: 64
                        });
                    }

                    // Check if there's an active queue
                    if (!queue) {
                        return interaction.reply({
                            embeds: [createEmbed('warning', 'No Active Queue', 'There is no active music session in this server.')],
                            flags: 64
                        });
                    }

                    // Check if user is in the same voice channel as bot
                    if (voiceChannel !== queue.voiceChannel) {
                        return interaction.reply({
                            embeds: [createEmbed('error', 'Wrong Voice Channel', 'You need to be in the same voice channel as the bot!')],
                            flags: 64
                        });
                    }

                    try {
                        switch (action) {
                            case 'pause':
                                await handlePauseButton(interaction, queue);
                                break;

                            case 'resume':
                                await handleResumeButton(interaction, queue);
                                break;

                            case 'skip':
                                await handleSkipButton(interaction, queue, client);
                                break;

                            case 'stop':
                                await handleStopButton(interaction, queue, client);
                                break;

                            case 'previous':
                                await handlePreviousButton(interaction, queue, client);
                                break;

                            case 'favorite':
                                await handleFavoriteButton(interaction, queue);
                                break;

                            case 'shuffle':
                                await handleShuffleButton(interaction, queue);
                                break;

                            case 'loop':
                                await handleLoopButton(interaction, queue);
                                break;

                            case 'volume_up':
                                await handleVolumeButton(interaction, queue, 'up');
                                break;

                            case 'volume_down':
                                await handleVolumeButton(interaction, queue, 'down');
                                break;

                            case 'queue':
                                await handleQueueButton(interaction, queue);
                                break;

                            default:
                                await interaction.reply({
                                    embeds: [createEmbed('error', 'Unknown Action', 'Unknown music control action.')],
                                    ephemeral: true
                                });
                        }
                    } catch (error) {
                        console.error(`Button interaction error (${action}):`, error);
                        await interaction.reply({
                            embeds: [createEmbed('error', 'Control Error', 'An error occurred while processing the music control.')],
                            ephemeral: true
                        });
                    }
                }
            }

            // Handle select menu interactions
            else if (interaction.type === InteractionType.MessageComponent && interaction.componentType === ComponentType.StringSelect) {
                await handleSelectMenuInteraction(interaction, client);
            }

        } catch (error) {
            console.error('Interaction error:', error);

            const errorEmbed = createEmbed('error', 'Interaction Error', 
                'An unexpected error occurred while processing your request. Please try again.');

            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ embeds: [errorEmbed] });
                } else {
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            } catch (replyError) {
                console.error('Failed to send error message:', replyError);
            }
        }
    }
};

/**
 * Handle slash command interactions
 */
async function handleSlashCommand(interaction, client) {
    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return interaction.reply({
            embeds: [createEmbed('error', 'Command Not Found', 'This command is not available.')],
            ephemeral: true
        });
    }

    // Log command usage
    console.log(`🎵 ${interaction.user.tag} used /${interaction.commandName} in ${interaction.guild?.name || 'DM'}`);

    try {
        // Execute the command
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);

        const errorEmbed = createEmbed('error', 'Command Error', 
            `An error occurred while executing the \`/${interaction.commandName}\` command.`);

        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
}

/**
 * Handle pause button interaction
 */
async function handlePauseButton(interaction, queue) {
    const { AudioPlayerStatus } = require('@discordjs/voice');

    if (!queue.playing || !queue.player) {
        return interaction.reply({
            embeds: [createEmbed('warning', 'Nothing Playing', 'There is no music currently playing!')],
            ephemeral: true
        });
    }

    if (queue.player.state.status === AudioPlayerStatus.Paused) {
        return interaction.reply({
            embeds: [createEmbed('warning', 'Already Paused', 'The music is already paused!')],
            ephemeral: true
        });
    }

    // Check permissions
    const hasPermission = await checkPermissions(interaction.member, 'dj') || 
                         await canControlSong(interaction.member, queue.songs[0], queue.voiceChannel);

    if (!hasPermission) {
        return interaction.reply({
            embeds: [createEmbed('error', 'Permission Denied', 'You need DJ permissions or be the song requester to pause!')],
            ephemeral: true
        });
    }

    queue.player.pause();

    const currentSong = queue.songs[0];
    await interaction.reply({
        embeds: [createEmbed('accent', `${interaction.client.config.emojis.pause} Music Paused`, 
            currentSong ? `Paused **${currentSong.title}**` : 'Music paused')]
    });
}

/**
 * Handle resume button interaction
 */
async function handleResumeButton(interaction, queue) {
    const { AudioPlayerStatus } = require('@discordjs/voice');

    if (!queue.player) {
        return interaction.reply({
            embeds: [createEmbed('warning', 'Nothing to Resume', 'There is no music to resume!')],
            ephemeral: true
        });
    }

    if (queue.player.state.status !== AudioPlayerStatus.Paused) {
        return interaction.reply({
            embeds: [createEmbed('warning', 'Not Paused', 'The music is not paused!')],
            ephemeral: true
        });
    }

    // Check permissions
    const hasPermission = await checkPermissions(interaction.member, 'dj') || 
                         await canControlSong(interaction.member, queue.songs[0], queue.voiceChannel);

    if (!hasPermission) {
        return interaction.reply({
            embeds: [createEmbed('error', 'Permission Denied', 'You need DJ permissions or be the song requester to resume!')],
            ephemeral: true
        });
    }

    queue.player.unpause();

    const currentSong = queue.songs[0];
    await interaction.reply({
        embeds: [createEmbed('secondary', `${interaction.client.config.emojis.play} Music Resumed`, 
            currentSong ? `Resumed **${currentSong.title}**` : 'Music resumed')]
    });
}

/**
 * Handle skip button interaction
 */
async function handleSkipButton(interaction, queue, client) {
    if (!queue.playing || !queue.player) {
        return interaction.reply({
            embeds: [createEmbed('warning', 'Nothing Playing', 'There is no music currently playing!')],
            ephemeral: true
        });
    }

    // Check permissions
    const hasPermission = await checkPermissions(interaction.member, 'dj') || 
                         await canControlSong(interaction.member, queue.songs[0], queue.voiceChannel);

    if (!hasPermission) {
        return interaction.reply({
            embeds: [createEmbed('error', 'Permission Denied', 'You need DJ permissions or be the song requester to skip!')],
            ephemeral: true
        });
    }

    const currentSong = queue.songs[0];

    // Clear timeout if exists
    if (queue.timeout) {
        clearTimeout(queue.timeout);
        queue.timeout = null;
    }

    // Stop current song (this will trigger the next song to play)
    queue.player.stop();

    await interaction.reply({
        embeds: [createEmbed('secondary', `${client.config.emojis.skip} Song Skipped`, 
            currentSong ? `Skipped **${currentSong.title}**` : 'Skipped current song')]
    });
}

/**
 * Handle stop button interaction
 */
async function handleStopButton(interaction, queue, client) {
    // Check permissions
    const hasPermission = await checkPermissions(interaction.member, 'dj') || 
                         queue.voiceChannel.members.filter(member => !member.user.bot).size <= 1;

    if (!hasPermission) {
        return interaction.reply({
            embeds: [createEmbed('error', 'Permission Denied', 'You need DJ permissions to stop the music!')],
            flags: 64
        });
    }

    const songsCleared = queue.songs.length;

    // Clear the queue
    queue.songs = [];
    queue.playing = false;
    queue.loop = false;
    queue.loopQueue = false;

    // Clear timeout if exists
    if (queue.timeout) {
        clearTimeout(queue.timeout);
        queue.timeout = null;
    }

    // Stop the player
    if (queue.player) {
        queue.player.stop();
    }

    // Disconnect from voice channel
    if (queue.connection) {
        queue.connection.destroy();
    }

    // Remove queue from memory
    client.musicQueues.delete(interaction.guild.id);

    await interaction.reply({
        embeds: [createEmbed('error', `${client.config.emojis.stop} Music Stopped`, 
            `Music stopped and queue cleared (${songsCleared} song${songsCleared !== 1 ? 's' : ''} removed).\nBot disconnected from voice channel.`)]
    });
}

/**
 * Handle previous button interaction
 */
async function handlePreviousButton(interaction, queue, client) {
    await interaction.reply({
        embeds: [createEmbed('warning', 'Previous Track', 'Previous track functionality is not implemented yet.')],
        ephemeral: true
    });
}

/**
 * Handle favorite button interaction
 */
async function handleFavoriteButton(interaction, queue) {
    const currentSong = queue.songs[0];
    await interaction.reply({
        embeds: [createEmbed('accent', '❤️ Added to Favorites', 
            currentSong ? `Added **${currentSong.title}** to your favorites!` : 'Song favorited!')]
    });
}

/**
 * Handle shuffle button interaction
 */
async function handleShuffleButton(interaction, queue) {
    const { checkPermissions } = require('../utils/permissions.js');

    if (queue.songs.length <= 1) {
        return interaction.reply({
            embeds: [createEmbed('warning', 'Not Enough Songs', 'Need at least 2 songs to shuffle!')],
            ephemeral: true
        });
    }

    const hasPermission = await checkPermissions(interaction.member, 'dj') || 
                         queue.voiceChannel.members.filter(member => !member.user.bot).size <= 1;

    if (!hasPermission) {
        return interaction.reply({
            embeds: [createEmbed('error', 'Permission Denied', 'You need DJ permissions to shuffle!')],
            ephemeral: true
        });
    }

    const currentSong = queue.songs[0];
    const remainingSongs = queue.songs.slice(1);

    for (let i = remainingSongs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingSongs[i], remainingSongs[j]] = [remainingSongs[j], remainingSongs[i]];
    }

    queue.songs = [currentSong, ...remainingSongs];

    await interaction.reply({
        embeds: [createEmbed('secondary', '🔀 Queue Shuffled', 
            `Shuffled ${remainingSongs.length} songs in the queue!`)]
    });
}

/**
 * Handle loop button interaction
 */
async function handleLoopButton(interaction, queue) {
    const { checkPermissions } = require('../utils/permissions.js');

    const hasPermission = await checkPermissions(interaction.member, 'dj') || 
                         queue.voiceChannel.members.filter(member => !member.user.bot).size <= 1;

    if (!hasPermission) {
        return interaction.reply({
            embeds: [createEmbed('error', 'Permission Denied', 'You need DJ permissions to change loop mode!')],
            ephemeral: true
        });
    }

    let newMode, emoji, description;

    if (!queue.loop && !queue.loopQueue) {
        queue.loop = true;
        newMode = 'Single';
        emoji = '🔂';
        description = 'Current song will repeat';
    } else if (queue.loop && !queue.loopQueue) {
        queue.loop = false;
        queue.loopQueue = true;
        newMode = 'Queue';
        emoji = '🔁';
        description = 'Queue will repeat';
    } else {
        queue.loop = false;
        queue.loopQueue = false;
        newMode = 'Off';
        emoji = '➡️';
        description = 'Loop disabled';
    }

    await interaction.reply({
        embeds: [createEmbed('secondary', `${emoji} Loop: ${newMode}`, description)]
    });
}

/**
 * Handle volume button interactions
 */
async function handleVolumeButton(interaction, queue, direction) {
    const { checkPermissions } = require('../utils/permissions.js');

    const hasPermission = await checkPermissions(interaction.member, 'dj') || 
                         queue.voiceChannel.members.filter(member => !member.user.bot).size <= 1;

    if (!hasPermission) {
        return interaction.reply({
            embeds: [createEmbed('error', 'Permission Denied', 'You need DJ permissions to change volume!')],
            ephemeral: true
        });
    }

    const oldVolume = queue.volume;
    let newVolume = direction === 'up' ? Math.min(oldVolume + 10, 200) : Math.max(oldVolume - 10, 0);

    queue.volume = newVolume;

    if (queue.player && queue.player.state.resource && queue.player.state.resource.volume) {
        queue.player.state.resource.volume.setVolume(newVolume / 100);
    }

    const volumeEmoji = newVolume === 0 ? '🔇' : newVolume <= 33 ? '🔈' : newVolume <= 66 ? '🔉' : '🔊';

    await interaction.reply({
        embeds: [createEmbed('secondary', `${volumeEmoji} Volume: ${newVolume}%`, 
            `Volume changed from ${oldVolume}% to ${newVolume}%`)]
    });
}

/**
 * Handle queue button interaction
 */
async function handleQueueButton(interaction, queue) {
    if (!queue || queue.songs.length === 0) {
        return interaction.reply({
            embeds: [createEmbed('warning', 'Empty Queue', 'The music queue is currently empty.')],
            ephemeral: true
        });
    }

    const { formatDuration } = require('../utils/formatters.js');
    const totalDuration = queue.songs.reduce((total, song) => total + (song.duration || 0), 0);

    let queueList = queue.songs.slice(0, 10).map((song, index) => {
        const indicator = index === 0 ? '🎵' : `${index + 1}.`;
        return `${indicator} **${song.title.length > 40 ? song.title.substring(0, 40) + '...' : song.title}**`;
    }).join('\n');

    if (queue.songs.length > 10) {
        queueList += `\n*...and ${queue.songs.length - 10} more songs*`;
    }

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📜 Music Queue')
        .setDescription(queueList)
        .addFields({
            name: 'Queue Info',
            value: `**Songs:** ${queue.songs.length}\n**Duration:** ${formatDuration(totalDuration)}\n**Volume:** ${queue.volume}%`,
            inline: true
        });

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Create music embed with progress bar
 */
function createMusicEmbed(song, status, queue) {
    const { EmbedBuilder } = require('discord.js');
    const { formatDuration } = require('../utils/formatters.js');

    let progressBar = generateProgressBar(queue.player.state.resource.playbackDuration, song.duration);

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(song.title)
        .setURL(song.url)
        .setDescription(`${progressBar} (${formatDuration(queue.player.state.resource.playbackDuration)} / ${formatDuration(song.duration)})`)
        .addFields(
            { name: 'Artist', value: song.artist, inline: true },
            { name: 'Requested by', value: `<@${song.requester.id}>`, inline: true },
        )
        .setFooter({ text: `Status: ${status}` });

    if (song.thumbnail) {
        embed.setThumbnail(song.thumbnail);
    }

    return embed;
}

/**
 * Generate progress bar
 */
function generateProgressBar(current, total) {
    const currentSeconds = current / 1000;
    const totalSeconds = total / 1000;

    const progress = Math.round((currentSeconds / totalSeconds) * 10);
    const bar = '█'.repeat(progress) + '—'.repeat(10 - progress);
    return bar;
}