const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const { createEmbed, createMusicEmbed } = require('../../utils/embeds.js');
const { formatDuration } = require('../../utils/formatters.js');
const { checkPermissions } = require('../../utils/permissions.js');
const SpotifyHelper = require('../../utils/spotifyHelper.js');
const YouTubeHelper = require('../../utils/youtubeHelper.js');
const ffmpeg = require('ffmpeg-static');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music from YouTube or Spotify')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name, YouTube URL, or Spotify URL')
                .setRequired(true)
        ),

    async execute(interaction) {
        const spotifyHelper = new SpotifyHelper();
        const youtubeHelper = new YouTubeHelper();
        
        try {
            // Check if user is in a voice channel
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Voice Channel Required', 'You need to be in a voice channel to play music!')],
                    flags: 64
                });
            }

            // Check bot permissions
            const permissions = voiceChannel.permissionsFor(interaction.client.user);
            if (!permissions.has('Connect') || !permissions.has('Speak')) {
                return interaction.reply({
                    embeds: [createEmbed('error', 'Missing Permissions', 'I need permission to connect and speak in your voice channel!')],
                    flags: 64
                });
            }

            await interaction.deferReply();

            const query = interaction.options.getString('query');
            let url = query;
            let spotifyInfo = null;

            // Check if it's a Spotify URL
            if (spotifyHelper.isSpotifyURL(query)) {
                const trackId = spotifyHelper.extractSpotifyId(query, 'track');
                
                if (!trackId) {
                    return interaction.editReply({
                        embeds: [createEmbed('error', 'Invalid Spotify URL', 'Please provide a valid Spotify track URL.')]
                    });
                }
                
                spotifyInfo = await spotifyHelper.getTrackInfo(trackId);
                if (!spotifyInfo) {
                    return interaction.editReply({
                        embeds: [createEmbed('error', 'Spotify Error', 'Unable to fetch track information from Spotify.')]
                    });
                }
                
                // Search for the Spotify track on YouTube
                const searchQuery = spotifyHelper.getYouTubeSearchQuery(spotifyInfo);
                const searchResult = await youtubeHelper.getBestResult(searchQuery);
                
                if (!searchResult) {
                    return interaction.editReply({
                        embeds: [createEmbed('error', 'Search Failed', `Could not find "${spotifyInfo.name}" by ${spotifyInfo.artists} on YouTube.`)]
                    });
                }
                
                url = searchResult.url;
            }
            // If not a direct YouTube URL, search YouTube
            else if (!youtubeHelper.isValidURL(query)) {
                const searchResult = await youtubeHelper.getBestResult(query);
                
                if (!searchResult) {
                    return interaction.editReply({
                        embeds: [createEmbed('error', 'Search Failed', `No results found for: **${query}**`)]
                    });
                }
                
                url = searchResult.url;
            }

            // Validate final YouTube URL
            if (!youtubeHelper.isValidURL(url)) {
                return interaction.editReply({
                    embeds: [createEmbed('error', 'Invalid URL', 'Unable to get a valid YouTube URL for this track.')]
                });
            }

            // Get video info with better error handling
            let videoInfo;
            try {
                videoInfo = await ytdl.getInfo(url);
            } catch (error) {
                console.error('YouTube info extraction error:', error);
                return interaction.editReply({
                    embeds: [createEmbed('error', 'Video Unavailable', 
                        'This video is unavailable, private, or region-restricted. Please try a different YouTube URL.')]
                });
            }
            
            const song = {
                title: spotifyInfo ? `${spotifyInfo.name} - ${spotifyInfo.artists}` : videoInfo.videoDetails.title,
                url: url,
                duration: parseInt(videoInfo.videoDetails.lengthSeconds),
                thumbnail: spotifyInfo ? spotifyInfo.image : videoInfo.videoDetails.thumbnails[0]?.url,
                requestedBy: interaction.user,
                addedAt: new Date(),
                spotifyInfo: spotifyInfo || null
            };

            // Get or create queue for this server
            let queue = interaction.client.musicQueues.get(interaction.guild.id);
            
            if (!queue) {
                // Create new queue
                queue = {
                    textChannel: interaction.channel,
                    voiceChannel: voiceChannel,
                    connection: null,
                    player: null,
                    songs: [],
                    volume: interaction.client.config.defaultVolume,
                    playing: false,
                    loop: false,
                    loopQueue: false,
                    autoplay: false,
                    timeout: null
                };
                
                interaction.client.musicQueues.set(interaction.guild.id, queue);
            }

            // Add song to queue
            queue.songs.push(song);

            // If not playing, start playing
            if (!queue.playing) {
                await this.playMusic(interaction.client, queue, interaction);
            } else {
                // Song added to queue embed
                const embed = createEmbed('secondary', `${interaction.client.config.emojis.music} Added to Queue`, 
                    `**[${song.title}](${song.url})**\n\n` +
                    `**Duration:** ${formatDuration(song.duration)}\n` +
                    `**Position in queue:** ${queue.songs.length}\n` +
                    `**Requested by:** ${song.requestedBy}`
                );
                
                if (song.thumbnail) {
                    embed.setThumbnail(song.thumbnail);
                }

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Play command error:', error);
            const errorEmbed = createEmbed('error', 'Playback Error', 
                'An error occurred while trying to play the song. Please try again.');
            
            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], flags: 64 });
            }
        }
    },

    // Search YouTube for a song
    async searchYouTube(query) {
        try {
            const searchResults = await ytsr(query, { limit: 1 });
            
            if (searchResults.items.length === 0) {
                return null;
            }

            const video = searchResults.items.find(item => item.type === 'video');
            
            if (!video) {
                return null;
            }

            return {
                url: video.url,
                title: video.title,
                duration: video.duration,
                thumbnail: video.bestThumbnail?.url
            };
        } catch (error) {
            console.error('YouTube search error:', error);
            return null;
        }
    },

    // Handle Spotify URL and extract track info
    async handleSpotifyURL(url) {
        try {
            // Initialize Spotify API (you can use public endpoints for basic info)
            const spotifyApi = new SpotifyWebApi();
            
            // Extract track ID from Spotify URL
            const trackId = this.extractSpotifyTrackId(url);
            
            if (!trackId) {
                return null;
            }

            // Get client credentials token (for public track info)
            const clientCredentialsGrant = await spotifyApi.clientCredentialsGrant();
            spotifyApi.setAccessToken(clientCredentialsGrant.body.access_token);

            // Get track information
            const trackInfo = await spotifyApi.getTrack(trackId);
            
            return {
                name: trackInfo.body.name,
                artists: trackInfo.body.artists.map(artist => artist.name).join(', '),
                album: trackInfo.body.album.name,
                duration: trackInfo.body.duration_ms,
                external_url: trackInfo.body.external_urls.spotify,
                image: trackInfo.body.album.images[0]?.url
            };
        } catch (error) {
            console.error('Spotify API error:', error);
            return null;
        }
    },

    // Extract Spotify track ID from URL
    extractSpotifyTrackId(url) {
        const match = url.match(/track\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    },

    async playMusic(client, queue, interaction) {
        const song = queue.songs[0];
        if (!song) {
            queue.playing = false;
            return;
        }

        try {
            // Join voice channel if not connected
            if (!queue.connection) {
                queue.connection = joinVoiceChannel({
                    channelId: queue.voiceChannel.id,
                    guildId: queue.voiceChannel.guild.id,
                    adapterCreator: queue.voiceChannel.guild.voiceAdapterCreator,
                });

                queue.connection.on(VoiceConnectionStatus.Disconnected, () => {
                    client.musicQueues.delete(interaction.guild.id);
                });
            }

            // Create audio resource with better error handling
            let stream;
            try {
                stream = ytdl(song.url, {
                    filter: 'audioonly',
                    quality: 'highestaudio',
                    highWaterMark: 1 << 25
                });
            } catch (error) {
                console.error('YouTube stream creation error:', error);
                queue.songs.shift();
                if (queue.songs.length > 0) {
                    return this.playMusic(client, queue, interaction);
                } else {
                    const errorEmbed = createEmbed('error', 'Stream Error', 
                        'Failed to create audio stream. The video may be unavailable.');
                    if (interaction.deferred) {
                        return interaction.editReply({ embeds: [errorEmbed] });
                    } else {
                        return interaction.reply({ embeds: [errorEmbed] });
                    }
                }
            }

            const resource = createAudioResource(stream, {
                inputType: require('@discordjs/voice').StreamType.Arbitrary,
                inlineVolume: true
            });

            // Create audio player if doesn't exist
            if (!queue.player) {
                queue.player = createAudioPlayer();
                queue.connection.subscribe(queue.player);

                // Player event handlers
                queue.player.on(AudioPlayerStatus.Playing, () => {
                    queue.playing = true;
                    console.log(`Now playing: ${song.title}`);
                });

                queue.player.on(AudioPlayerStatus.Idle, () => {
                    // Song finished, play next
                    if (!queue.loop) {
                        queue.songs.shift();
                    }
                    
                    if (queue.songs.length > 0) {
                        this.playMusic(client, queue, interaction);
                    } else {
                        queue.playing = false;
                        // Set timeout for auto-disconnect
                        queue.timeout = setTimeout(() => {
                            if (queue.connection) {
                                queue.connection.destroy();
                                client.musicQueues.delete(interaction.guild.id);
                            }
                        }, client.config.autoDisconnectTime);
                    }
                });

                queue.player.on('error', error => {
                    console.error('Audio player error:', error);
                    queue.songs.shift();
                    if (queue.songs.length > 0) {
                        this.playMusic(client, queue, interaction);
                    }
                });
            }

            // Set volume
            resource.volume?.setVolume(queue.volume / 100);

            // Start playing
            queue.player.play(resource);
            
            // Reset progress tracking for new song
            queue.startTime = Date.now();
            queue.pausedTime = 0;
            queue.lastPauseStart = null;

            // Create modern UI music embed
            const embed = createMusicEmbed(song, 'Playing', queue);

            // Create modern control buttons matching the UI design
            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('music_previous')
                        .setEmoji('⏮️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_pause')
                        .setEmoji('⏸️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_skip')
                        .setEmoji('⏭️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_favorite')
                        .setEmoji('❤️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_stop')
                        .setEmoji('⏹️')
                        .setStyle(ButtonStyle.Danger)
                );

            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('music_volume_down')
                        .setEmoji('🔉')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_volume_up')
                        .setEmoji('🔊')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_shuffle')
                        .setEmoji('🔀')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_loop')
                        .setEmoji('🔁')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_queue')
                        .setEmoji('📜')
                        .setStyle(ButtonStyle.Secondary)
                );

            let playMessage;
            if (interaction.deferred) {
                playMessage = await interaction.editReply({ embeds: [embed], components: [row1, row2] });
            } else {
                playMessage = await interaction.reply({ embeds: [embed], components: [row1, row2] });
            }

            // Set up automatic progress tracking
            queue.progressMessage = playMessage;
            queue.progressChannelId = interaction.channel.id;
            
            // Start automatic progress updates every 5 seconds
            const musicPlayer = interaction.client.musicPlayer || new (require('../../handlers/musicPlayer.js'))(interaction.client);
            musicPlayer.startProgressTracking(queue);

        } catch (error) {
            console.error('Play music error:', error);
            queue.songs.shift();
            if (queue.songs.length > 0) {
                this.playMusic(client, queue, interaction);
            } else {
                const errorEmbed = createEmbed('error', 'Playback Error', 
                    'Failed to play the current song. Skipping to next...');
                
                if (interaction.deferred) {
                    await interaction.editReply({ embeds: [errorEmbed] });
                } else {
                    await interaction.reply({ embeds: [errorEmbed] });
                }
            }
        }
    }
};
