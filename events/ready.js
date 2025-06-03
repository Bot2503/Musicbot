const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    
    async execute(client) {
        console.log(`🎵 Angel Music Bot is ready!`);
        console.log(`📊 Logged in as ${client.user.tag}`);
        console.log(`🌐 Serving ${client.guilds.cache.size} server${client.guilds.cache.size !== 1 ? 's' : ''}`);
        console.log(`👥 Watching over ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)} users`);
        
        // Set bot activity/status
        const activities = [
            { name: '/play to start the music!', type: ActivityType.Listening },
            { name: 'your requests', type: ActivityType.Listening },
            { name: 'music in voice channels', type: ActivityType.Playing },
            { name: '/help for commands', type: ActivityType.Watching },
            { name: 'Angel Music 🎵', type: ActivityType.Playing }
        ];
        
        let activityIndex = 0;
        
        // Set initial activity
        client.user.setActivity(activities[activityIndex]);
        
        // Rotate activities every 30 seconds
        setInterval(() => {
            activityIndex = (activityIndex + 1) % activities.length;
            client.user.setActivity(activities[activityIndex]);
        }, 30000);
        
        // Set online status
        client.user.setStatus('online');
        
        // Log startup stats
        console.log(`📈 Bot Statistics:`);
        console.log(`   Commands loaded: ${client.commands.size}`);
        console.log(`   Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        console.log(`   Node.js version: ${process.version}`);
        console.log(`   Discord.js version: ${require('discord.js').version}`);
        console.log(`⚡ Bot fully initialized and ready to serve music!`);
        
        // Clean up any orphaned voice connections on restart
        if (client.voice && client.voice.connections && client.voice.connections.size > 0) {
            console.log(`🧹 Cleaning up ${client.voice.connections.size} orphaned voice connection(s)...`);
            client.voice.connections.forEach(connection => {
                connection.destroy();
            });
        }
        
        // Initialize music queues collection if not exists
        if (!client.musicQueues) {
            client.musicQueues = new Map();
        }
        
        // Log ready timestamp for stats
        client.readyAt = new Date();
        
        // Emit custom ready event for other modules
        client.emit('angelMusicReady');
    }
};
