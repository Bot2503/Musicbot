module.exports = {
    // Bot configuration
    token: process.env.DISCORD_TOKEN || '',
    clientId: process.env.CLIENT_ID || '',
    
    // Music configuration
    maxQueueSize: 100,
    defaultVolume: 50,
    maxVolume: 200,
    autoDisconnectTime: 300000, // 5 minutes in milliseconds
    
    // Discord colors
    colors: {
        primary: 0x5865F2,    // Discord blurple
        secondary: 0x57F287,  // Discord green
        accent: 0xFEE75C,     // Discord yellow
        error: 0xED4245,      // Discord red
        background: 0x2F3136   // Discord dark
    },
    
    // Emojis for better UX
    emojis: {
        play: '▶️',
        pause: '⏸️',
        stop: '⏹️',
        skip: '⏭️',
        previous: '⏮️',
        shuffle: '🔀',
        repeat: '🔁',
        repeatOne: '🔂',
        volume: '🔊',
        volumeMute: '🔇',
        queue: '📜',
        music: '🎵',
        loading: '⏳',
        success: '✅',
        error: '❌',
        warning: '⚠️'
    },
    
    // Bot permissions
    permissions: {
        dj: ['MANAGE_CHANNELS', 'MOVE_MEMBERS'],
        basic: []
    },
    
    // YouTube configuration
    youtube: {
        quality: 'highestaudio',
        filter: 'audioonly'
    }
};
