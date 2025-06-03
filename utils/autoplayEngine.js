
const ytsr = require('ytsr');
const ytdl = require('@distube/ytdl-core');

/**
 * Advanced autoplay engine for finding similar songs
 */
class AutoplayEngine {
    constructor() {
        this.cache = new Map(); // Cache for related songs
        this.searchPatterns = [
            'mix', 'playlist', 'similar', 'like', 'best of', 'top songs',
            'greatest hits', 'compilation', 'collection'
        ];
    }

    /**
     * Find related songs based on current or recently played songs
     * @param {Array} recentSongs - Array of recently played songs
     * @param {number} count - Number of songs to find
     * @returns {Promise<Array>} Array of related songs
     */
    async findRelatedSongs(recentSongs, count = 5) {
        if (!recentSongs || recentSongs.length === 0) {
            return this.getPopularSongs(count);
        }

        const lastSong = recentSongs[recentSongs.length - 1];
        const cacheKey = `related_${lastSong.id || lastSong.title}`;

        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 3600000) { // 1 hour cache
                return cached.songs.slice(0, count);
            }
        }

        try {
            // Extract keywords from song title for search
            const searchTerms = this.extractSearchTerms(lastSong.title);
            const relatedSongs = [];

            for (const term of searchTerms.slice(0, 3)) { // Limit to prevent rate limiting
                try {
                    const searchResults = await this.searchYouTube(term, 2);
                    relatedSongs.push(...searchResults);
                    
                    if (relatedSongs.length >= count) break;
                } catch (error) {
                    console.warn(`Search failed for term: ${term}`, error.message);
                    continue;
                }
            }

            // Remove duplicates and filter out the original song
            const uniqueSongs = this.removeDuplicates(relatedSongs, recentSongs);
            
            // Cache the results
            this.cache.set(cacheKey, {
                songs: uniqueSongs,
                timestamp: Date.now()
            });

            return uniqueSongs.slice(0, count);

        } catch (error) {
            console.error('Error finding related songs:', error);
            return this.getPopularSongs(count);
        }
    }

    /**
     * Extract search terms from song title
     * @param {string} title - Song title
     * @returns {Array} Array of search terms
     */
    extractSearchTerms(title) {
        // Clean title and extract meaningful terms
        const cleanTitle = title
            .replace(/\([^)]*\)/g, '') // Remove parentheses content
            .replace(/\[[^\]]*\]/g, '') // Remove bracket content
            .replace(/\bhd\b|\bofficial\b|\bvideo\b|\blyrics\b|\bmv\b/gi, '') // Remove common video terms
            .replace(/[^\w\s]/g, ' ') // Remove special characters
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();

        const words = cleanTitle.split(' ').filter(word => word.length > 2);
        
        // Generate search terms
        const searchTerms = [];
        
        // Artist + genre combinations
        if (words.length >= 2) {
            searchTerms.push(`${words[0]} ${words[1]} mix`);
            searchTerms.push(`${words[0]} similar songs`);
        }
        
        // Add specific genre/style terms if detected
        const genres = this.detectGenre(title);
        for (const genre of genres) {
            searchTerms.push(`${genre} music mix`);
            searchTerms.push(`best ${genre} songs`);
        }

        // Fallback general terms
        if (searchTerms.length === 0) {
            searchTerms.push(`${cleanTitle} similar`);
            searchTerms.push('popular music mix');
        }

        return searchTerms;
    }

    /**
     * Detect genre/style from song title
     * @param {string} title - Song title
     * @returns {Array} Array of detected genres
     */
    detectGenre(title) {
        const genres = [];
        const titleLower = title.toLowerCase();

        const genreKeywords = {
            'phonk': ['phonk', 'drift'],
            'lofi': ['lofi', 'lo-fi', 'chill', 'study'],
            'trap': ['trap', 'bass'],
            'house': ['house', 'edm', 'electronic'],
            'pop': ['pop', 'mainstream'],
            'rock': ['rock', 'metal'],
            'hip hop': ['hip hop', 'rap', 'hiphop'],
            'jazz': ['jazz', 'smooth'],
            'classical': ['classical', 'orchestra'],
            'ambient': ['ambient', 'relaxing']
        };

        for (const [genre, keywords] of Object.entries(genreKeywords)) {
            if (keywords.some(keyword => titleLower.includes(keyword))) {
                genres.push(genre);
            }
        }

        return genres;
    }

    /**
     * Search YouTube for songs using ytsr
     * @param {string} query - Search query
     * @param {number} limit - Number of results
     * @returns {Promise<Array>} Array of song objects
     */
    async searchYouTube(query, limit = 5) {
        try {
            const searchResults = await ytsr(query, { 
                limit: limit * 2, // Get more results to filter out non-music content
                safeSearch: false
            });

            const musicResults = [];
            
            for (const item of searchResults.items) {
                if (item.type !== 'video') continue;
                if (musicResults.length >= limit) break;
                
                // Filter out non-music content
                if (this.isLikelyMusic(item)) {
                    try {
                        // Validate that the video is accessible
                        const info = await ytdl.getBasicInfo(item.url);
                        
                        musicResults.push({
                            title: item.title,
                            url: item.url,
                            duration: this.parseDuration(item.duration),
                            thumbnail: item.bestThumbnail?.url || item.thumbnails?.[0]?.url,
                            requestedBy: 'Autoplay System',
                            addedAt: new Date(),
                            id: item.id,
                            uploader: item.author?.name
                        });
                    } catch (error) {
                        // Skip videos that can't be played
                        console.warn(`Skipping unplayable video: ${item.title}`);
                        continue;
                    }
                }
            }

            return musicResults;

        } catch (error) {
            console.error('YouTube search error:', error);
            // Fallback to mock results if search fails
            return this.generateMockSearchResults(query, limit);
        }
    }

    /**
     * Check if a search result is likely to be music
     * @param {Object} item - Search result item
     * @returns {boolean} Whether the item is likely music
     */
    isLikelyMusic(item) {
        const title = item.title.toLowerCase();
        const author = item.author?.name?.toLowerCase() || '';
        
        // Music indicators
        const musicKeywords = [
            'official music video', 'official video', 'lyrics', 'audio',
            'music video', 'official audio', 'full song', 'original mix'
        ];
        
        // Non-music indicators
        const nonMusicKeywords = [
            'tutorial', 'how to', 'review', 'reaction', 'gameplay',
            'news', 'interview', 'behind the scenes', 'making of'
        ];
        
        // Check for music indicators
        const hasMusicKeywords = musicKeywords.some(keyword => 
            title.includes(keyword) || author.includes(keyword)
        );
        
        // Check for non-music indicators
        const hasNonMusicKeywords = nonMusicKeywords.some(keyword => 
            title.includes(keyword)
        );
        
        // Duration check (music is usually between 30 seconds and 10 minutes)
        const duration = this.parseDuration(item.duration);
        const isReasonableDuration = duration >= 30 && duration <= 600;
        
        return (hasMusicKeywords || isReasonableDuration) && !hasNonMusicKeywords;
    }

    /**
     * Parse duration string to seconds
     * @param {string} duration - Duration string (e.g., "3:45")
     * @returns {number} Duration in seconds
     */
    parseDuration(duration) {
        if (!duration) return 0;
        
        const parts = duration.split(':').map(Number);
        if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return 0;
    }

    /**
     * Generate mock search results (fallback)
     * @param {string} query - Search query
     * @param {number} count - Number of results
     * @returns {Array} Mock results
     */
    generateMockSearchResults(query, count) {
        const mockTitles = [
            `${query} - Popular Mix`,
            `Best of ${query}`,
            `${query} Compilation`,
            `${query} Hits Collection`,
            `${query} Music Playlist`
        ];

        return mockTitles.slice(0, count).map((title, index) => ({
            title: title,
            url: `https://youtube.com/watch?v=mock_${Date.now()}_${index}`,
            duration: Math.floor(Math.random() * 240) + 120, // 2-6 minutes
            thumbnail: 'https://img.youtube.com/vi/default/maxresdefault.jpg',
            requestedBy: 'Autoplay System',
            addedAt: new Date(),
            id: `mock_${Date.now()}_${index}`
        }));
    }

    /**
     * Get popular songs as fallback
     * @param {number} count - Number of songs
     * @returns {Promise<Array>} Popular songs
     */
    async getPopularSongs(count = 5) {
        const popularQueries = [
            'popular music 2024',
            'trending songs',
            'top hits playlist',
            'viral music mix',
            'best songs ever'
        ];

        const randomQuery = popularQueries[Math.floor(Math.random() * popularQueries.length)];
        
        try {
            return await this.searchYouTube(randomQuery, count);
        } catch (error) {
            console.error('Failed to get popular songs:', error);
            return this.generateMockSearchResults(randomQuery, count);
        }
    }

    /**
     * Remove duplicate songs
     * @param {Array} newSongs - New songs to filter
     * @param {Array} existingSongs - Existing songs to compare against
     * @returns {Array} Filtered unique songs
     */
    removeDuplicates(newSongs, existingSongs) {
        const existingTitles = new Set(existingSongs.map(song => song.title.toLowerCase()));
        const existingUrls = new Set(existingSongs.map(song => song.url));
        
        return newSongs.filter(song => {
            const titleLower = song.title.toLowerCase();
            if (existingTitles.has(titleLower) || existingUrls.has(song.url)) return false;
            
            existingTitles.add(titleLower);
            existingUrls.add(song.url);
            return true;
        });
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
}

module.exports = new AutoplayEngine();
