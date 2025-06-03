
const ytsr = require('ytsr');
const ytdl = require('@distube/ytdl-core');

class YouTubeHelper {
    constructor() {
        this.searchOptions = {
            limit: 5,
            type: 'video'
        };
    }

    // Search for videos on YouTube
    async search(query, limit = 1) {
        try {
            const searchResults = await ytsr(query, { limit });
            
            if (!searchResults.items || searchResults.items.length === 0) {
                return [];
            }

            const videos = searchResults.items
                .filter(item => item.type === 'video' && item.duration)
                .map(video => ({
                    title: video.title,
                    url: video.url,
                    duration: this.parseDuration(video.duration),
                    thumbnail: video.bestThumbnail?.url || video.thumbnails?.[0]?.url,
                    views: video.views,
                    uploadedAt: video.uploadedAt,
                    author: video.author?.name
                }));

            return videos;
        } catch (error) {
            console.error('YouTube search error:', error);
            return [];
        }
    }

    // Get best search result
    async getBestResult(query) {
        const results = await this.search(query, 1);
        return results.length > 0 ? results[0] : null;
    }

    // Parse duration string to seconds
    parseDuration(durationString) {
        if (!durationString) return 0;
        
        const parts = durationString.split(':').reverse();
        let seconds = 0;
        
        for (let i = 0; i < parts.length; i++) {
            seconds += parseInt(parts[i]) * Math.pow(60, i);
        }
        
        return seconds;
    }

    // Validate YouTube URL
    isValidURL(url) {
        return ytdl.validateURL(url);
    }

    // Get video info from URL
    async getVideoInfo(url) {
        try {
            if (!this.isValidURL(url)) {
                return null;
            }

            const info = await ytdl.getInfo(url);
            
            return {
                title: info.videoDetails.title,
                url: url,
                duration: parseInt(info.videoDetails.lengthSeconds),
                thumbnail: info.videoDetails.thumbnails[0]?.url,
                views: info.videoDetails.viewCount,
                author: info.videoDetails.author.name,
                description: info.videoDetails.description
            };
        } catch (error) {
            console.error('Error getting YouTube video info:', error);
            return null;
        }
    }

    // Search and get multiple results for selection
    async searchWithOptions(query, limit = 5) {
        const results = await this.search(query, limit);
        
        return results.map((result, index) => ({
            index: index + 1,
            ...result,
            formattedDuration: this.formatDuration(result.duration)
        }));
    }

    // Format duration for display
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }
}

module.exports = YouTubeHelper;
