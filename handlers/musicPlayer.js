const { createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const { createEmbed } = require('../utils/embeds.js');
const { formatDuration } = require('../utils/formatters.js');

class MusicPlayer {
    constructor(client) {
        this.client = client;
    }

    // Create a new music queue for a guild
    createQueue(textChannel, voiceChannel) {
        const queue = {
            textChannel: textChannel,
            voiceChannel: voiceChannel,
            connection: null,
            player: null,
            songs: [],
            volume: this.client.config.defaultVolume,
            playing: false,
            loop: false,
            loopQueue: false,
            autoplay: false,
            mode247: false,
            timeout: null,
            nowPlayingMessage: null,
            history: [], // Track played songs for autoplay
            startTime: null, // Track when song started
            pausedTime: 0, // Track total paused time
            lastPauseStart: null // Track when last pause started
        };

        this.client.musicQueues.set(textChannel.guild.id, queue);
        return queue;
    }

    // Play the next song in queue
    async playNext(queue) {
        if (queue.songs.length === 0) {
            queue.playing = false;
            
            // Set timeout for auto-disconnect
            queue.timeout = setTimeout(() => {
                this.disconnect(queue);
            }, this.client.config.autoDisconnectTime);
            
            return;
        }

        try {
            const song = queue.songs[0];
            
            // Create audio stream with better error handling
            let stream;
            try {
                stream = ytdl(song.url, {
                    filter: 'audioonly',
                    quality: 'highestaudio',
                    highWaterMark: 1 << 25
                });
            } catch (streamError) {
                console.error('YouTube stream creation error:', streamError);
                // Skip problematic song and try next
                queue.songs.shift();
                if (queue.songs.length > 0) {
                    return await this.playNext(queue);
                } else {
                    queue.playing = false;
                    const errorEmbed = createEmbed('error', 'Stream Error', 
                        'Failed to create audio stream. The video may be unavailable.');
                    await queue.textChannel.send({ embeds: [errorEmbed] });
                    return;
                }
            }

            const resource = createAudioResource(stream, {
                inlineVolume: true
            });

            // Set volume
            resource.volume?.setVolume(queue.volume / 100);

            // Create player if it doesn't exist
            if (!queue.player) {
                queue.player = createAudioPlayer();
                this.setupPlayerEvents(queue);
                queue.connection.subscribe(queue.player);
            }

            // Start playing
            queue.player.play(resource);
            queue.playing = true;

            // Clear any existing timeout
            if (queue.timeout) {
                clearTimeout(queue.timeout);
                queue.timeout = null;
            }

        } catch (error) {
            console.error('Error playing song:', error);
            
            // Skip problematic song and try next
            queue.songs.shift();
            if (queue.songs.length > 0) {
                await this.playNext(queue);
            } else {
                queue.playing = false;
                
                const errorEmbed = createEmbed('error', 'Playback Error', 
                    'Failed to play the song. It may be unavailable or region-restricted.');
                
                await queue.textChannel.send({ embeds: [errorEmbed] });
            }
        }
    }

    // Setup audio player event handlers
    setupPlayerEvents(queue) {
        queue.player.on(AudioPlayerStatus.Playing, () => {
            if (!queue.startTime) {
                queue.startTime = Date.now();
                queue.pausedTime = 0;
            } else if (queue.lastPauseStart) {
                // Resuming from pause
                queue.pausedTime += Date.now() - queue.lastPauseStart;
                queue.lastPauseStart = null;
            }
            
            // Start progress tracking
            this.startProgressTracking(queue);
            console.log(`Now playing: ${queue.songs[0]?.title}`);
        });

        queue.player.on(AudioPlayerStatus.Idle, async () => {
            // Clean up progress tracking
            this.cleanupProgress(queue);
            
            // Song finished
            if (!queue.loop) {
                const finishedSong = queue.songs.shift();
                
                // Add to history for autoplay (keep last 10 songs)
                if (finishedSong) {
                    queue.history = queue.history || [];
                    queue.history.push(finishedSong);
                    if (queue.history.length > 10) {
                        queue.history.shift();
                    }
                }
                
                // Add to end of queue if looping queue
                if (queue.loopQueue) {
                    queue.songs.push(finishedSong);
                }
            }
            
            // Reset progress tracking for next song
            queue.startTime = null;
            queue.pausedTime = 0;
            queue.lastPauseStart = null;

            // Play next song
            if (queue.songs.length > 0) {
                await this.playNext(queue);
            } else {
                queue.playing = false;
                
                // Check for autoplay
                if (queue.autoplay) {
                    try {
                        await this.handleAutoplay(queue);
                    } catch (error) {
                        console.error('Autoplay error:', error);
                        // Continue to normal disconnect behavior if autoplay fails
                    }
                }
                
                // Set timeout for auto-disconnect (only if not in 24/7 mode)
                if (!queue.mode247 && queue.songs.length === 0) {
                    queue.timeout = setTimeout(() => {
                        this.disconnect(queue);
                    }, this.client.config.autoDisconnectTime);
                }
            }
        });

        queue.player.on('error', async (error) => {
            console.error('Audio player error:', error);
            
            // Skip problematic song
            queue.songs.shift();
            if (queue.songs.length > 0) {
                await this.playNext(queue);
            } else {
                queue.playing = false;
            }
        });
    }

    // Disconnect from voice channel and cleanup
    disconnect(queue) {
        try {
            if (queue.connection) {
                queue.connection.destroy();
            }
            
            if (queue.timeout) {
                clearTimeout(queue.timeout);
            }
            
            // Remove queue from memory
            this.client.musicQueues.delete(queue.textChannel.guild.id);
            
            console.log(`Disconnected from voice channel in guild: ${queue.textChannel.guild.name}`);
        } catch (error) {
            console.error('Error during disconnect:', error);
        }
    }

    // Add song to queue
    addSong(queue, song) {
        if (queue.songs.length >= this.client.config.maxQueueSize) {
            throw new Error(`Queue is full! Maximum ${this.client.config.maxQueueSize} songs allowed.`);
        }
        
        queue.songs.push(song);
    }

    // Remove song from queue by index
    removeSong(queue, index) {
        if (index < 0 || index >= queue.songs.length) {
            throw new Error('Invalid song index');
        }
        
        return queue.songs.splice(index, 1)[0];
    }

    // Shuffle queue (keeping current song first)
    shuffleQueue(queue) {
        if (queue.songs.length <= 1) {
            throw new Error('Not enough songs to shuffle');
        }
        
        const currentSong = queue.songs[0];
        const remainingSongs = queue.songs.slice(1);
        
        // Fisher-Yates shuffle
        for (let i = remainingSongs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [remainingSongs[i], remainingSongs[j]] = [remainingSongs[j], remainingSongs[i]];
        }
        
        queue.songs = [currentSong, ...remainingSongs];
    }

    // Set volume
    setVolume(queue, volume) {
        if (volume < 0 || volume > this.client.config.maxVolume) {
            throw new Error(`Volume must be between 0 and ${this.client.config.maxVolume}`);
        }
        
        queue.volume = volume;
        
        // Apply to current resource if playing
        if (queue.player && queue.player.state.resource && queue.player.state.resource.volume) {
            queue.player.state.resource.volume.setVolume(volume / 100);
        }
    }

    // Toggle loop modes
    toggleLoop(queue, mode = null) {
        if (mode === null) {
            // Cycle through modes: off -> single -> queue -> off
            if (!queue.loop && !queue.loopQueue) {
                queue.loop = true;
                return 'single';
            } else if (queue.loop && !queue.loopQueue) {
                queue.loop = false;
                queue.loopQueue = true;
                return 'queue';
            } else {
                queue.loop = false;
                queue.loopQueue = false;
                return 'off';
            }
        } else {
            // Set specific mode
            switch (mode) {
                case 'off':
                    queue.loop = false;
                    queue.loopQueue = false;
                    break;
                case 'single':
                    queue.loop = true;
                    queue.loopQueue = false;
                    break;
                case 'queue':
                    queue.loop = false;
                    queue.loopQueue = true;
                    break;
                default:
                    throw new Error('Invalid loop mode');
            }
            return mode;
        }
    }

    // Skip current song
    skip(queue) {
        if (!queue.playing || !queue.player) {
            throw new Error('Nothing is currently playing');
        }
        
        queue.player.stop();
    }

    // Pause playback
    pause(queue) {
        if (!queue.playing || !queue.player) {
            throw new Error('Nothing is currently playing');
        }
        
        if (queue.player.state.status === AudioPlayerStatus.Paused) {
            throw new Error('Music is already paused');
        }
        
        queue.lastPauseStart = Date.now();
        queue.player.pause();
        
        // Stop progress tracking
        this.stopProgressTracking(queue);
    }

    // Resume playback
    resume(queue) {
        if (!queue.player) {
            throw new Error('Nothing to resume');
        }
        
        if (queue.player.state.status !== AudioPlayerStatus.Paused) {
            throw new Error('Music is not paused');
        }
        
        queue.player.unpause();
        
        // Resume progress tracking
        this.startProgressTracking(queue);
    }

    // Stop playback and clear queue
    stop(queue) {
        queue.songs = [];
        queue.playing = false;
        queue.loop = false;
        queue.loopQueue = false;
        
        if (queue.player) {
            queue.player.stop();
        }
        
        this.disconnect(queue);
    }

    // Handle autoplay when queue is empty
    async handleAutoplay(queue) {
        if (!queue.autoplay) return;

        const autoplayEngine = require('../utils/autoplayEngine.js');
        
        // Get recent songs for context (last 5 played songs)
        const recentSongs = queue.history || [];
        
        try {
            // Find related songs
            const relatedSongs = await autoplayEngine.findRelatedSongs(recentSongs, 3);
            
            if (relatedSongs.length > 0) {
                // Add songs to queue
                queue.songs.push(...relatedSongs);
                
                // Send notification to text channel
                const { createEmbed } = require('../utils/embeds.js');
                const embed = createEmbed('success', '🎵 Autoplay Active', 
                    `Added ${relatedSongs.length} similar songs to keep the music going!`
                );
                
                await queue.textChannel.send({ embeds: [embed] });
                
                // Continue playing
                await this.playNext(queue);
            }
        } catch (error) {
            console.error('Autoplay failed:', error);
            throw error;
        }
    }

    // Get current playback progress in seconds
    getCurrentProgress(queue) {
        if (!queue || !queue.startTime) {
            return 0;
        }
        
        const now = Date.now();
        const elapsed = now - queue.startTime - queue.pausedTime;
        
        // Add time from current pause if paused
        const pauseAdjustment = queue.lastPauseStart ? (now - queue.lastPauseStart) : 0;
        
        const currentTime = Math.max(0, Math.floor((elapsed - pauseAdjustment) / 1000));
        
        // Don't exceed song duration
        const song = queue.songs[0];
        if (song && song.duration && currentTime > song.duration) {
            return song.duration;
        }
        
        return currentTime;
    }

    // Override disconnect method to respect 24/7 mode
    disconnect(queue) {
        try {
            // Don't disconnect if in 24/7 mode
            if (queue.mode247) {
                console.log(`24/7 mode active - staying connected in guild: ${queue.textChannel.guild.name}`);
                return;
            }

            if (queue.connection) {
                queue.connection.destroy();
            }
            
            if (queue.timeout) {
                clearTimeout(queue.timeout);
            }
            
            // Remove queue from memory
            this.client.musicQueues.delete(queue.textChannel.guild.id);
            
            console.log(`Disconnected from voice channel in guild: ${queue.textChannel.guild.name}`);
        } catch (error) {
            console.error('Error during disconnect:', error);
        }
    }

    // Start real-time progress tracking
    startProgressTracking(queue) {
        // Clear existing interval
        this.stopProgressTracking(queue);
        
        // Update progress every 5 seconds
        queue.progressInterval = setInterval(async () => {
            await this.updateProgress(queue);
        }, 5000);
    }

    // Stop progress tracking
    stopProgressTracking(queue) {
        if (queue.progressInterval) {
            clearInterval(queue.progressInterval);
            queue.progressInterval = null;
        }
    }

    // Update progress display
    async updateProgress(queue) {
        try {
            if (!queue.progressMessage || !queue.songs[0] || !queue.playing) {
                return;
            }

            const currentSong = queue.songs[0];
            const currentProgress = this.getCurrentProgress(queue);
            
            // Don't update if song is finished
            if (currentSong.duration && currentProgress >= currentSong.duration) {
                return;
            }

            // Create updated embed
            const { createMusicEmbed } = require('../utils/embeds.js');
            const embed = createMusicEmbed(currentSong, 'Playing', queue);

            // Update the message
            await queue.progressMessage.edit({ embeds: [embed] });

        } catch (error) {
            // Stop tracking if message was deleted or channel is inaccessible
            console.error('Progress update error:', error);
            this.stopProgressTracking(queue);
        }
    }

    // Enhanced getCurrentProgress with better accuracy
    getCurrentProgress(queue) {
        if (!queue || !queue.startTime) {
            return 0;
        }
        
        const now = Date.now();
        let elapsed = now - queue.startTime - queue.pausedTime;
        
        // Subtract current pause time if paused
        if (queue.lastPauseStart) {
            elapsed -= (now - queue.lastPauseStart);
        }
        
        const currentTime = Math.max(0, Math.floor(elapsed / 1000));
        
        // Don't exceed song duration
        const song = queue.songs[0];
        if (song && song.duration && currentTime > song.duration) {
            return song.duration;
        }
        
        return currentTime;
    }

    // Static method to get current progress from any queue
    static getCurrentProgress(queue) {
        if (!queue || !queue.startTime) {
            return 0;
        }
        
        const now = Date.now();
        let elapsed = now - queue.startTime - queue.pausedTime;
        
        // Subtract current pause time if paused
        if (queue.lastPauseStart) {
            elapsed -= (now - queue.lastPauseStart);
        }
        
        const currentTime = Math.max(0, Math.floor(elapsed / 1000));
        
        // Don't exceed song duration
        const song = queue.songs[0];
        if (song && song.duration && currentTime > song.duration) {
            return song.duration;
        }
        
        return currentTime;
    }

    // Clean up progress tracking when song ends
    cleanupProgress(queue) {
        this.stopProgressTracking(queue);
        queue.progressMessage = null;
        queue.progressChannelId = null;
    }
}

module.exports = MusicPlayer;
