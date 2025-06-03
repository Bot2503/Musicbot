require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const config = require('./config/config.js');
const commandHandler = require('./handlers/commandHandler.js');
const eventHandler = require('./handlers/eventHandler.js');

// Create Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ]
});

// Initialize collections for commands and music queues
client.commands = new Collection();
client.musicQueues = new Collection();
client.config = config;

// Bot startup time for stats
client.startTime = Date.now();

// Load command and event handlers
commandHandler(client);
eventHandler(client);

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception thrown:', error);
    process.exit(1);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN || config.token)
    .then(() => {
        console.log('🎵 Angel Music Bot is starting up...');
    })
    .catch(error => {
        console.error('Failed to login:', error);
        process.exit(1);
    });

module.exports = client;
