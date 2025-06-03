/**
 * Format duration in seconds to human readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "3:45", "1:23:45")
 */
function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse time string to seconds
 * @param {string} timeString - Time string (e.g., "1:30", "90s", "2m30s")
 * @returns {number|null} Seconds or null if invalid
 */
function parseTimeString(timeString) {
    if (!timeString || typeof timeString !== 'string') return null;
    
    timeString = timeString.toLowerCase().trim();
    
    // Format: "1:30" or "1:23:45"
    if (timeString.includes(':')) {
        const parts = timeString.split(':').map(part => parseInt(part));
        
        if (parts.length === 2) {
            // MM:SS
            const [minutes, seconds] = parts;
            if (isNaN(minutes) || isNaN(seconds) || seconds >= 60) return null;
            return minutes * 60 + seconds;
        } else if (parts.length === 3) {
            // HH:MM:SS
            const [hours, minutes, seconds] = parts;
            if (isNaN(hours) || isNaN(minutes) || isNaN(seconds) || minutes >= 60 || seconds >= 60) return null;
            return hours * 3600 + minutes * 60 + seconds;
        }
        
        return null;
    }
    
    // Format: "90s", "2m", "1h", "2m30s", etc.
    let totalSeconds = 0;
    
    // Match hours
    const hoursMatch = timeString.match(/(\d+)h/);
    if (hoursMatch) {
        totalSeconds += parseInt(hoursMatch[1]) * 3600;
    }
    
    // Match minutes
    const minutesMatch = timeString.match(/(\d+)m/);
    if (minutesMatch) {
        totalSeconds += parseInt(minutesMatch[1]) * 60;
    }
    
    // Match seconds
    const secondsMatch = timeString.match(/(\d+)s/);
    if (secondsMatch) {
        totalSeconds += parseInt(secondsMatch[1]);
    }
    
    // If no units found, treat as seconds
    if (totalSeconds === 0) {
        const numberMatch = timeString.match(/^(\d+)$/);
        if (numberMatch) {
            totalSeconds = parseInt(numberMatch[1]);
        }
    }
    
    return totalSeconds > 0 ? totalSeconds : null;
}

/**
 * Format a number with commas for better readability
 * @param {number} number - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(number) {
    if (!number || isNaN(number)) return '0';
    return number.toLocaleString();
}

/**
 * Format bytes to human readable format
 * @param {number} bytes - Bytes to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted bytes (e.g., "1.5 MB")
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format percentage with proper rounding
 * @param {number} value - Value to convert to percentage
 * @param {number} total - Total value
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
function formatPercentage(value, total, decimals = 1) {
    if (!total || total === 0) return '0%';
    const percentage = (value / total) * 100;
    return `${percentage.toFixed(decimals)}%`;
}

/**
 * Truncate text to specified length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength) {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format uptime in a human readable format
 * @param {number} milliseconds - Uptime in milliseconds
 * @returns {string} Formatted uptime
 */
function formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    const parts = [];
    
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);
    
    return parts.join(' ');
}

/**
 * Clean YouTube video title by removing common tags
 * @param {string} title - Original video title
 * @returns {string} Cleaned title
 */
function cleanYouTubeTitle(title) {
    if (!title || typeof title !== 'string') return '';
    
    return title
        // Remove common video tags
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?(official|video|audio|lyric|lyrics|music|mv|hd|4k).*?\)/gi, '')
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Format song info for display
 * @param {Object} song - Song object
 * @param {boolean} includeRequester - Whether to include requester info
 * @returns {string} Formatted song info
 */
function formatSongInfo(song, includeRequester = true) {
    if (!song) return 'Unknown song';
    
    let info = `**[${song.title}](${song.url})**`;
    
    if (song.duration) {
        info += `\n${formatDuration(song.duration)}`;
    }
    
    if (includeRequester && song.requestedBy) {
        info += ` | ${song.requestedBy}`;
    }
    
    return info;
}

/**
 * Create a progress bar for song playback
 * @param {number} current - Current time in seconds
 * @param {number} total - Total duration in seconds
 * @param {number} length - Length of progress bar
 * @returns {string} Progress bar string
 */
function createProgressBar(current, total, length = 20) {
    if (!total || total === 0) return '▱'.repeat(length);
    
    const progress = Math.min(current / total, 1);
    const filledLength = Math.round(progress * length);
    const emptyLength = length - filledLength;
    
    // Use better visual characters
    const filled = '▰'.repeat(Math.max(0, filledLength - 1));
    const empty = '▱'.repeat(emptyLength);
    const indicator = filledLength > 0 ? '🔘' : '';
    
    return filled + indicator + empty;
}

module.exports = {
    formatDuration,
    parseTimeString,
    formatNumber,
    formatBytes,
    formatPercentage,
    truncateText,
    formatUptime,
    cleanYouTubeTitle,
    formatSongInfo,
    createProgressBar
};
