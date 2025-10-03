/**
 * Export all public APIs
 */

// Main generator
export { PosterGenerator } from './poster-generator';
export type { AutoBackgroundOptions } from './poster-generator';

// Base classes
export { PosterDesign, BackgroundMode } from './core/base';

// Background modes
export {
	BlackBackground,
	WhiteBackground,
	SolidColorBackground,
	GradientTopBackground,
	GradientBottomBackground,
	CustomGradientBackground,
	RadialGradientBackground,
	ImageBackground,
	AlbumColorPaletteBackground,
	CustomBackground,
} from './core/background-modes';

// Designs
export { Album1Design } from './designs/album-1';
// Song designs to be added (song-1.ts, song-2.ts, etc.)

// Types
export type {
	AlbumData,
	PosterConfig,
	BackgroundConfig,
	RenderContext,
	RGB,
	// Music platform types
	SongData,
	TrackData,
	MusicAlbumData,
	SpotifyTrackData,
	SpotifyAlbumData,
	AppleMusicTrackData,
	AppleMusicAlbumData,
	YouTubeMusicTrackData,
	YouTubeMusicAlbumData,
	SoundCloudTrackData,
	SoundCloudAlbumData,
	MusicPlatform,
} from './types';

// Type guards
export {
	isSpotifyTrack,
	isAppleMusicTrack,
	isYouTubeMusicTrack,
	isSoundCloudTrack,
	isSpotifyAlbum,
	isAppleMusicAlbum,
	isYouTubeMusicAlbum,
	isSoundCloudAlbum,
} from './types';

// Utilities
export * from './utils/color-utils';
export * from './utils/canvas-utils';
export * from './utils/music-utils';
