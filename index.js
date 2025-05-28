const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Player } = require('discord-player');
const { YoutubeiExtractor } = require('discord-player-youtubei');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ]
});

// Create player instance
const player = new Player(client, {
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25
    }
});

// Register extractors
player.extractors.register(YoutubeiExtractor, {});

// Store player instance on client for access in commands
client.player = player;

// Create commands collection
client.commands = new Collection();

// Load commands
const commandFolders = fs.readdirSync('./commands');
for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(`./commands/${folder}/${file}`);
        client.commands.set(command.data.name, command);
    }
}

// Load events
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// Player events
player.events.on('playerStart', (queue, track) => {
    const { createNowPlayingEmbed } = require('./utils/embeds');
    const { createMusicControlButtons } = require('./utils/buttons');
    
    // Delete previous nowplaying message if it exists
    if (queue.metadata && queue.metadata.nowPlayingMessage) {
        queue.metadata.nowPlayingMessage.delete().catch(console.error);
    }
    
    if (queue.metadata && queue.metadata.channel) {
        queue.metadata.channel.send({
            embeds: [createNowPlayingEmbed(track)],
            components: [createMusicControlButtons()]
        }).then(message => {
            // Store the message reference for later deletion
            queue.metadata.nowPlayingMessage = message;
        }).catch(console.error);
    }
});

player.events.on('audioTrackAdd', (queue, track) => {
    if (queue.metadata && queue.metadata.channel) {
        const embed = {
            color: 0x00ff00,
            title: '🎵 Track Added to Queue',
            description: `**${track.title}** by ${track.author}`,
            thumbnail: { url: track.thumbnail },
            fields: [
                { name: 'Duration', value: track.duration, inline: true },
                { name: 'Position in Queue', value: `${queue.tracks.size}`, inline: true }
            ],
            timestamp: new Date()
        };
        queue.metadata.channel.send({ embeds: [embed] }).then(message => {
            // Auto-delete after 2 seconds
            setTimeout(() => {
                if (message.deletable) {
                    message.delete().catch(console.error);
                }
            }, 2000);
        }).catch(console.error);
    }
});

player.events.on('emptyQueue', (queue) => {
    // Delete any existing nowplaying messages when queue ends
    if (queue.metadata && queue.metadata.nowPlayingMessage) {
        queue.metadata.nowPlayingMessage.delete().catch(console.error);
        queue.metadata.nowPlayingMessage = null;
    }
    
    if (queue.metadata && queue.metadata.channel) {
        const embed = {
            color: 0xffff00,
            title: '🎵 Queue Finished',
            description: 'All tracks have been played. Add more music or use `/play` to continue!',
            timestamp: new Date()
        };
        queue.metadata.channel.send({ embeds: [embed] }).then(message => {
            // Auto-delete after 30 seconds
            setTimeout(() => {
                if (message.deletable) {
                    message.delete().catch(console.error);
                }
            }, 30000);
        }).catch(console.error);
    }
});

player.events.on('playerError', (queue, error) => {
    console.error('Player error:', error);
    if (queue.metadata && queue.metadata.channel) {
        const embed = {
            color: 0xff0000,
            title: '❌ Playback Error',
            description: 'An error occurred while playing the track. Skipping to next track...',
            timestamp: new Date()
        };
        queue.metadata.channel.send({ embeds: [embed] });
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Login
client.login(process.env.DISCORD_TOKEN);
