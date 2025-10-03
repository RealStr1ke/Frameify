/**
 * Utilities for working with music platform data
 */

import type {
	SongData,
	TrackData,
	SpotifyTrackData,
	AppleMusicTrackData,
	YouTubeMusicTrackData,
	SoundCloudTrackData,
	MusicPlatform,
} from '../types';

/**
 * Get platform identifier from track data
 */
export function getPlatform(data: TrackData): MusicPlatform {
	if ('platform' in data) {
		return data.platform;
	}
	return 'generic';
}

/**
 * Format duration as MM:SS
 */
export function formatDuration(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Format duration as human-readable (e.g., "3 minutes 54 seconds")
 */
export function formatDurationLong(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;

	if (minutes === 0) {
		return `${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
	}

	if (remainingSeconds === 0) {
		return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
	}

	return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
}

/**
 * Get platform-specific URL for a track
 */
export function getTrackUrl(data: TrackData): string | undefined {
	if ('platform' in data) {
		switch (data.platform) {
			case 'spotify':
				return (data as SpotifyTrackData).spotifyUrl;
			case 'appleMusic':
				return (data as AppleMusicTrackData).appleMusicUrl;
			case 'youtubeMusic':
				return (data as YouTubeMusicTrackData).youtubeUrl;
			case 'soundcloud':
				return (data as SoundCloudTrackData).soundcloudUrl;
		}
	}
	return undefined;
}

/**
 * Get Spotify scan code URL (for generating Spotify Code images)
 */
export function getSpotifyCodeUrl(data: TrackData): string | undefined {
	if ('platform' in data && data.platform === 'spotify') {
		return (data as SpotifyTrackData).spotifyCodeUrl;
	}
	return undefined;
}

/**
 * Get platform display name
 */
export function getPlatformName(platform: MusicPlatform): string {
	switch (platform) {
		case 'spotify':
			return 'Spotify';
		case 'appleMusic':
			return 'Apple Music';
		case 'youtubeMusic':
			return 'YouTube Music';
		case 'soundcloud':
			return 'SoundCloud';
		case 'generic':
		default:
			return 'Music';
	}
}

/**
 * Convert generic SongData to platform-specific data
 */
export function toPlatformData<T extends TrackData>(
	songData: SongData,
	platform: MusicPlatform,
	platformSpecificData: Partial<T>,
): T {
	return {
		...songData,
		platform,
		...platformSpecificData,
	} as T;
}

/**
 * Normalize track data to generic SongData
 */
export function toGenericSongData(data: TrackData): SongData {
	return {
		title: data.title,
		artist: data.artist,
		album: data.album,
		albumArtPath: data.albumArtPath,
		duration: data.duration,
		releaseDate: data.releaseDate,
		genres: data.genres,
		isrc: data.isrc,
	};
}

/**
 * Check if track data has platform-specific information
 */
export function hasPlatformData(data: TrackData): boolean {
	return 'platform' in data;
}

/**
 * Get play count (for SoundCloud)
 */
export function getPlayCount(data: TrackData): number | undefined {
	if ('platform' in data && data.platform === 'soundcloud') {
		return (data as SoundCloudTrackData).playCount;
	}
	return undefined;
}

/**
 * Format number with K/M/B suffixes
 */
export function formatNumber(num: number): string {
	if (num >= 1_000_000_000) {
		return `${(num / 1_000_000_000).toFixed(1)}B`;
	}
	if (num >= 1_000_000) {
		return `${(num / 1_000_000).toFixed(1)}M`;
	}
	if (num >= 1_000) {
		return `${(num / 1_000).toFixed(1)}K`;
	}
	return num.toString();
}
