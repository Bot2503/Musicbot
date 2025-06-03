
const SpotifyWebApi = require('spotify-web-api-node');

class SpotifyHelper {
    constructor() {
        this.spotifyApi = new SpotifyWebApi({
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET
        });
        this.tokenExpirationTime = 0;
    }

    // Get access token for Spotify API
    async getAccessToken() {
        try {
            const now = Date.now();
            
            // Check if token is still valid
            if (now < this.tokenExpirationTime) {
                return true;
            }

            const data = await this.spotifyApi.clientCredentialsGrant();
            
            this.spotifyApi.setAccessToken(data.body.access_token);
            this.tokenExpirationTime = now + (data.body.expires_in * 1000) - 60000; // Refresh 1 minute early
            
            return true;
        } catch (error) {
            console.error('Spotify token error:', error);
            return false;
        }
    }

    // Get track info from Spotify
    async getTrackInfo(trackId) {
        try {
            await this.getAccessToken();
            const trackInfo = await this.spotifyApi.getTrack(trackId);
            
            return {
                name: trackInfo.body.name,
                artists: trackInfo.body.artists.map(artist => artist.name).join(', '),
                album: trackInfo.body.album.name,
                duration: Math.floor(trackInfo.body.duration_ms / 1000),
                external_url: trackInfo.body.external_urls.spotify,
                image: trackInfo.body.album.images[0]?.url,
                preview_url: trackInfo.body.preview_url
            };
        } catch (error) {
            console.error('Error getting Spotify track info:', error);
            return null;
        }
    }

    // Get playlist info from Spotify
    async getPlaylistInfo(playlistId) {
        try {
            await this.getAccessToken();
            const playlistInfo = await this.spotifyApi.getPlaylist(playlistId);
            
            return {
                name: playlistInfo.body.name,
                description: playlistInfo.body.description,
                tracks: playlistInfo.body.tracks.items.map(item => ({
                    name: item.track.name,
                    artists: item.track.artists.map(artist => artist.name).join(', '),
                    duration: Math.floor(item.track.duration_ms / 1000),
                    external_url: item.track.external_urls.spotify
                })),
                external_url: playlistInfo.body.external_urls.spotify,
                image: playlistInfo.body.images[0]?.url
            };
        } catch (error) {
            console.error('Error getting Spotify playlist info:', error);
            return null;
        }
    }

    // Extract Spotify ID from URL
    extractSpotifyId(url, type = 'track') {
        const regex = new RegExp(`${type}\/([a-zA-Z0-9]+)`);
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    // Check if URL is Spotify
    isSpotifyURL(url) {
        return url.includes('spotify.com') && (url.includes('/track/') || url.includes('/playlist/') || url.includes('/album/'));
    }

    // Get search query for YouTube from Spotify track
    getYouTubeSearchQuery(spotifyTrack) {
        return `${spotifyTrack.artists} ${spotifyTrack.name}`;
    }
}

module.exports = SpotifyHelper;
