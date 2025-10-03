/**
 * Frameify - Music Poster Generator
 *
 * A modular poster generation system with support for multiple music platforms,
 * high-resolution cover art fetching, and comprehensive metadata enrichment.
 */

// ============================================================================
// Main Generator
// ============================================================================

export { PosterGenerator } from './poster-generator';
export type { AutoBackgroundOptions } from './poster-generator';

// ============================================================================
// Core Components
// ============================================================================

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
	BlurredAlbumCoverBackground,
	AlbumColorPaletteBackground,
	CustomBackground,
} from './core/background-modes';

// ============================================================================
// Designs
// ============================================================================

export { Album1Design } from './designs/album-1';
// Future designs: song-1.ts, album-2.ts, etc.

// ============================================================================
// Music Platform Integrations
// ============================================================================

// Base provider class
export { MusicProvider } from './integrations/providers/base';

// Provider implementations
export { SpotifyProvider } from './integrations/providers/spotify';
// Future providers: AppleMusicProvider, YouTubeMusicProvider, SoundCloudProvider

// ============================================================================
// Metadata Enrichment
// ============================================================================

// Cover art fetching (Music Hoarders API - 9 sources)
export { CoverFetcher, getBestAlbumCover, getAllAlbumCovers } from './integrations/covers';
export type { CoverResult, CoverSearchOptions } from './integrations/covers';

// Record label information (MusicBrainz API)
export { LabelFetcher, getAlbumLabel } from './integrations/label';
export type { LabelInfo, ReleaseInfo } from './integrations/label';

// ============================================================================
// Type System
// ============================================================================

export type {
	// Core album/track types
	AlbumData,
	TrackData,
	DiscData,
	MusicAlbumData,

	// Platform-specific types
	SpotifyTrackData,
	SpotifyAlbumData,
	AppleMusicTrackData,
	AppleMusicAlbumData,
	YouTubeMusicTrackData,
	YouTubeMusicAlbumData,
	SoundCloudTrackData,
	SoundCloudAlbumData,
	MusicPlatform,

	// Poster configuration
	PosterConfig,
	BackgroundConfig,
	RenderContext,
	RGB,
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

// ============================================================================
// Utilities
// ============================================================================

export * from './utils/color-utils';
export * from './utils/canvas-utils';
export * from './utils/music-utils';
