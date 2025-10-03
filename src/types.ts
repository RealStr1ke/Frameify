/**
 * Core types and interfaces for the poster generator system
 */

import type { Canvas, CanvasRenderingContext2D } from 'canvas';

/**
 * RGB color representation
 */
export interface RGB {
	r: number;
	g: number;
	b: number;
}

/**
 * Configuration for poster generation
 */
export interface PosterConfig {
	width: number;
	height: number;
	margin: number;
	textColor?: string;
	dividerColor?: string;
}

/**
 * Background mode configuration
 */
export interface BackgroundConfig {
	type: 'solid' | 'gradient' | 'image' | 'custom';
	colors?: string[];
	imagePath?: string;
	customRenderer?: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

/**
 * Context passed to design renderers
 */
export interface RenderContext {
	canvas: Canvas;
	ctx: CanvasRenderingContext2D;
	config: PosterConfig;
	data: any;
	extractedColors?: string[];
}

// ============================================================================
// Music Data Types
// ============================================================================

/**
 * Disc information for multi-disc albums
 */
export interface DiscData {
	discNumber: number;
	discTitle?: string; // Optional disc title (e.g., "Disc 1: The Beginning")
	tracks: TrackData[];
}

/**
 * Common track data
 * Includes album-level metadata for access to release info
 */
export interface TrackData {
	// Track-specific info
	title: string;
	artist: string;
	duration: number; // in seconds
	trackNumber?: number;
	discNumber?: number;
	isrc?: string;

	// Album reference (populated when from album)
	album?: AlbumData; // Full album data when fetched from album

	// Standalone track fields (when NOT from album)
	albumTitle?: string;
	albumArtPath?: string;
	releaseDate?: string;
	copyright?: string;
	genres?: string[];
}

/**
 * Album data structure
 */
export interface AlbumData {
	coverImagePath: string;
	title: string;
	artist: string;
	releaseDate: string;
	copyright?: string;

	// Track organization
	tracks: TrackData[]; // For single-disc albums
	discs?: DiscData[]; // For multi-disc albums (if present, use this instead of tracks)

	// Optional metadata
	totalTracks?: number;
	totalDiscs?: number;
	genres?: string[];
	label?: string;
	barcode?: string;
}

/**
 * Song data for individual track posters
 */
export interface SongData {
	title: string;
	artist: string;
	album?: string;
	coverImagePath: string;
	releaseDate: string;
	duration: number;
	progress?: number; // 0-1 (0% to 100%)
	copyright?: string;
	label?: string;
	genres?: string[];
	trackNumber?: number;
	totalTracks?: number;
	isrc?: string;
}

/**
 * Spotify-specific data
 */
export interface SpotifyTrackData extends TrackData {
	platform: 'spotify';
	spotifyId: string;
	spotifyUri: string;
	spotifyUrl: string;
	spotifyCodeUrl?: string; // URL to generate Spotify scan code image
}

export interface SpotifyAlbumData extends AlbumData {
	platform: 'spotify';
	spotifyId: string;
	spotifyUri: string;
	spotifyUrl: string;
	spotifyCodeUrl?: string; // URL to generate Spotify scan code image
}

/**
 * Apple Music-specific data
 */
export interface AppleMusicTrackData extends TrackData {
	platform: 'appleMusic';
	appleMusicId: string;
	appleMusicUrl: string;
}

export interface AppleMusicAlbumData extends AlbumData {
	platform: 'appleMusic';
	appleMusicId: string;
	appleMusicUrl: string;
}

/**
 * YouTube Music-specific data
 */
export interface YouTubeMusicTrackData extends TrackData {
	platform: 'youtubeMusic';
	videoId: string;
	youtubeUrl: string;
}

export interface YouTubeMusicAlbumData extends AlbumData {
	platform: 'youtubeMusic';
	playlistId?: string;
	youtubeUrl: string;
}

/**
 * SoundCloud-specific data
 */
export interface SoundCloudTrackData extends TrackData {
	platform: 'soundcloud';
	soundcloudId: number;
	soundcloudUrl: string;
	playCount?: number; // Play count if you want to display it
}

export interface SoundCloudAlbumData extends AlbumData {
	platform: 'soundcloud';
	soundcloudId: number;
	soundcloudUrl: string;
	playlistType?: 'album' | 'compilation' | 'ep-single';
}

/**
 * Union types for flexibility
 */
export type MusicTrackData =
	| TrackData
	| SpotifyTrackData
	| AppleMusicTrackData
	| YouTubeMusicTrackData
	| SoundCloudTrackData;

export type MusicAlbumData =
	| AlbumData
	| SpotifyAlbumData
	| AppleMusicAlbumData
	| YouTubeMusicAlbumData
	| SoundCloudAlbumData;

/**
 * Platform identifier
 */
export type MusicPlatform = 'spotify' | 'appleMusic' | 'youtubeMusic' | 'soundcloud' | 'generic';

// ============================================================================
// Type Guard Functions
// ============================================================================

/**
 * Helper type guard functions for track data
 */
export function isSpotifyTrack(data: TrackData): data is SpotifyTrackData {
	return 'platform' in data && data.platform === 'spotify';
}

export function isAppleMusicTrack(data: TrackData): data is AppleMusicTrackData {
	return 'platform' in data && data.platform === 'appleMusic';
}

export function isYouTubeMusicTrack(data: TrackData): data is YouTubeMusicTrackData {
	return 'platform' in data && data.platform === 'youtubeMusic';
}

export function isSoundCloudTrack(data: TrackData): data is SoundCloudTrackData {
	return 'platform' in data && data.platform === 'soundcloud';
}

export function isSpotifyAlbum(data: MusicAlbumData): data is SpotifyAlbumData {
	return 'platform' in data && data.platform === 'spotify';
}

export function isAppleMusicAlbum(data: MusicAlbumData): data is AppleMusicAlbumData {
	return 'platform' in data && data.platform === 'appleMusic';
}

export function isYouTubeMusicAlbum(data: MusicAlbumData): data is YouTubeMusicAlbumData {
	return 'platform' in data && data.platform === 'youtubeMusic';
}

export function isSoundCloudAlbum(data: MusicAlbumData): data is SoundCloudAlbumData {
	return 'platform' in data && data.platform === 'soundcloud';
}
