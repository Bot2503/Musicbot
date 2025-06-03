const { EmbedBuilder } = require('discord.js');

/**
 * Create a standardized embed with Angel Music Bot styling
 * @param {string} type - Type of embed (primary, secondary, accent, error, warning, success)
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 * @param {Object} options - Additional embed options
 * @returns {EmbedBuilder} Configured embed
 */
function createEmbed(type, title, description, options = {}) {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();

    // Set color based on type
    const colors = {
        primary: 0x5865F2,    // Discord blurple
        secondary: 0x57F287,  // Discord green
        accent: 0xFEE75C,     // Discord yellow
        error: 0xED4245,      // Discord red
        warning: 0xFEE75C,    // Discord yellow
        success: 0x57F287,    // Discord green
        background: 0x2F3136   // Discord dark
    };

    embed.setColor(colors[type] || colors.primary);

    // Apply additional options
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.image) embed.setImage(options.image);
    if (options.footer) embed.setFooter(options.footer);
    if (options.author) embed.setAuthor(options.author);
    if (options.url) embed.setURL(options.url);
    if (options.fields) {
        options.fields.forEach(field => embed.addFields(field));
    }

    return embed;
}

/**
 * Create a music-specific embed with modern UI styling
 * @param {Object} song - Song object
 * @param {string} status - Current status (playing, paused, etc.)
 * @param {Object} queue - Queue object
 * @returns {EmbedBuilder} Music embed
 */
function createMusicEmbed(song, status, queue) {
    // Get current progress
    const MusicPlayer = require('../handlers/musicPlayer.js');
    const { formatDuration } = require('./formatters.js');
    const currentProgress = MusicPlayer.getCurrentProgress(queue) || 0;
    const totalDuration = song.duration || 0;

    // Create progress bar
    let progressBar = '';
    let progressText = '';

    if (totalDuration > 0) {
        const progressPercentage = Math.min((currentProgress / totalDuration) * 100, 100);
        const progressBarLength = 20;
        const filledBars = Math.round((progressPercentage / 100) * progressBarLength);
        const emptyBars = progressBarLength - filledBars;

        progressBar = `[${'█'.repeat(filledBars)}${'─'.repeat(emptyBars)}]`;
        progressText = `${formatDuration(currentProgress)} / ${formatDuration(totalDuration)}`;
    } else {
        progressBar = '[──────────────────────]';
        progressText = '00:00 / 00:00';
    }

    const embed = new EmbedBuilder()
        .setColor(0x2F3136) // Dark theme color
        .setTitle(`🎵 ${status}`)
        .setDescription(`**[${song.title}](${song.url})**\n\n${progressBar}\n${progressText}`)
        .addFields(
            {
                name: '⏱️ Duration',
                value: formatDuration(song.duration),
                inline: true
            },
            {
                name: '👤 Requested by',
                value: `${song.requestedBy.username || song.requestedBy}`,
                inline: true
            },
            {
                name: '🔊 Volume',
                value: `${queue?.volume || 50}%`,
                inline: true
            }
        )
        .setTimestamp()
        .setFooter({
            text: `Queue: ${queue?.songs?.length || 0} songs`,
            iconURL: 'https://cdn.discordapp.com/emojis/🎵.png'
        });

    if (song.thumbnail) {
        embed.setThumbnail(song.thumbnail);
    }

    // Add loop status if enabled
    if (queue?.loop || queue?.loopQueue) {
        const loopText = queue.loop ? '🔂 Single Loop' : '🔁 Queue Loop';
        embed.addFields({
            name: '🔄 Loop Status',
            value: loopText,
            inline: true
        });
    }

    return embed;
}

/**
 * Create a queue embed with pagination
 * @param {Array} songs - Array of songs
 * @param {number} page - Current page
 * @param {number} totalPages - Total pages
 * @param {Object} queue - Queue object
 * @returns {EmbedBuilder} Queue embed
 */
function createQueueEmbed(songs, page, totalPages, queue) {
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📜 Music Queue')
        .setFooter({ 
            text: `Page ${page} of ${totalPages} • Volume: ${queue.volume}%`
        })
        .setTimestamp();

    // Calculate total duration
    const totalDuration = songs.reduce((total, song) => total + (song.duration || 0), 0);

    embed.setDescription(
        `**Total songs:** ${songs.length}\n` +
        `**Total duration:** ${require('./formatters.js').formatDuration(totalDuration)}\n` +
        `**Loop mode:** ${queue.loop ? 'Single' : queue.loopQueue ? 'Queue' : 'Off'}`
    );

    // Add current playing song
    if (queue.playing && songs[0]) {
        embed.addFields({
            name: '🎵 Now Playing',
            value: `**[${songs[0].title}](${songs[0].url})**\n` +
                   `Duration: ${require('./formatters.js').formatDuration(songs[0].duration)} | ` +
                   `Requested by: ${songs[0].requestedBy}`,
            inline: false
        });
    }

    return embed;
}

/**
 * Create an error embed with consistent styling
 * @param {string} title - Error title
 * @param {string} description - Error description
 * @param {string} solution - Optional solution text
 * @returns {EmbedBuilder} Error embed
 */
function createErrorEmbed(title, description, solution = null) {
    const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setTimestamp();

    if (solution) {
        embed.addFields({
            name: '💡 Solution',
            value: solution,
            inline: false
        });
    }

    return embed;
}

/**
 * Create a success embed with consistent styling
 * @param {string} title - Success title
 * @param {string} description - Success description
 * @returns {EmbedBuilder} Success embed
 */
function createSuccessEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(`✅ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Create a warning embed with consistent styling
 * @param {string} title - Warning title
 * @param {string} description - Warning description
 * @returns {EmbedBuilder} Warning embed
 */
function createWarningEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(`⚠️ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

module.exports = {
    createEmbed,
    createMusicEmbed,
    createQueueEmbed,
    createErrorEmbed,
    createSuccessEmbed,
    createWarningEmbed
};