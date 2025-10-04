/**
 * Frameify - Music Poster Generator
 *
 * A modular poster generation system with support for multiple music platforms,
 * high-resolution cover art fetching, and comprehensive metadata enrichment.
 */

import * as canvas from 'canvas';
import * as fs from 'node:fs';
import type { PosterDesign as PosterDesignBase, BackgroundMode as BackgroundModeBase } from './core/base';
import { AlbumColorPaletteBackground } from './core/background-modes';
import * as BackgroundsImport from './core/background-modes';
import { Album1Design } from './designs/album-1';
import { Song1Design } from './designs/song-1';
import { SpotifySongDesign } from './designs/spotify-song';
import { MusicProvider } from './integrations/providers/base';
import { SpotifyProvider, getSpotifyCodeUrl, getTransparentSpotifyCode, getSpotifyCodeFromUrl, getSpotifyCodeBuffer } from './integrations/providers/spotify';
import { CoverFetcher, getBestAlbumCover, getAllAlbumCovers } from './integrations/covers';
import { LabelFetcher, getAlbumLabel } from './integrations/label';
import * as ColorUtils from './utils/color-utils';
import * as CanvasUtils from './utils/canvas-utils';
import * as MusicUtils from './utils/music-utils';
import type * as TypesImport from './types';

// ============================================================================
// Main Frameify Class
// ============================================================================

/**
 * Options for automatic background generation
 */
export interface AutoBackgroundOptions {
	direction?: 'lightToDark' | 'darkToLight';
	style?: 'smooth' | 'emphasized';
}

/**
 * Main Frameify poster generator class with fluent API
 */
export class Frameify<TData = any> {
	private design: PosterDesignBase<TData> | null = null;
	private backgroundMode: BackgroundModeBase | null = null;
	private useAutoBackground: boolean = false;
	private autoBackgroundOptions: AutoBackgroundOptions = {};

	/**
	 * Set the poster design
	 */
	withDesign(design: PosterDesignBase<TData>): this {
		this.design = design;
		return this;
	}

	/**
	 * Set the background mode
	 */
	withBackground(mode: BackgroundModeBase): this {
		this.backgroundMode = mode;
		this.useAutoBackground = false;
		return this;
	}

	/**
	 * Use automatic background based on extracted colors (if design supports it)
	 */
	withAutoBackground(options: AutoBackgroundOptions = {}): this {
		this.useAutoBackground = true;
		this.backgroundMode = null;
		this.autoBackgroundOptions = {
			direction: options.direction ?? 'lightToDark',
			style: options.style ?? 'emphasized',
		};
		return this;
	}

	/**
	 * Generate the poster and save to file
	 */
	async generate(data: TData, outputPath: string): Promise<void> {
		if (!this.design) {
			throw new Error('Design is required. Use withDesign() to set a design.');
		}

		const config = this.design.getConfig();

		console.log(`Generating ${this.design.getName()}...`);
		console.log(`Canvas size: ${config.width}x${config.height}`);

		const posterCanvas = canvas.createCanvas(config.width, config.height);
		const ctx = posterCanvas.getContext('2d');

		const renderContext = await this.design.prepareRenderContext(data, posterCanvas, ctx);

		let background = this.backgroundMode;

		if (this.useAutoBackground) {
			if (renderContext.extractedColors && renderContext.extractedColors.length > 0) {
				background = new AlbumColorPaletteBackground(
					renderContext.extractedColors,
					this.autoBackgroundOptions.style ?? 'emphasized',
					this.autoBackgroundOptions.direction ?? 'lightToDark',
				);
				console.log(`Using automatic background with extracted colors (${this.autoBackgroundOptions.direction})`);
			} else {
				console.warn('No extracted colors available, falling back to black background');
				const { BlackBackground } = await import('./core/background-modes');
				background = new BlackBackground();
			}
		}

		if (!background) {
			console.warn('No background mode specified, using black background');
			const { BlackBackground } = await import('./core/background-modes');
			background = new BlackBackground();
		}

		console.log(`Rendering background: ${background.getDescription()}`);
		await background.render(ctx, config.width, config.height);

		console.log('Rendering poster content...');
		await this.design.renderContent(renderContext);

		console.log(`Saving poster to ${outputPath}...`);
		const buffer = posterCanvas.toBuffer('image/png');
		fs.writeFileSync(outputPath, buffer);
		console.log('✓ Poster saved successfully!');
	}

	/**
	 * Generate poster and return as buffer instead of saving to file
	 */
	async generateBuffer(data: TData): Promise<Buffer> {
		if (!this.design) {
			throw new Error('Design is required. Use withDesign() to set a design.');
		}

		const config = this.design.getConfig();
		const posterCanvas = canvas.createCanvas(config.width, config.height);
		const ctx = posterCanvas.getContext('2d');

		const renderContext = await this.design.prepareRenderContext(data, posterCanvas, ctx);

		let background = this.backgroundMode;

		if (this.useAutoBackground && renderContext.extractedColors && renderContext.extractedColors.length > 0) {
			background = new AlbumColorPaletteBackground(
				renderContext.extractedColors,
				this.autoBackgroundOptions.style ?? 'emphasized',
				this.autoBackgroundOptions.direction ?? 'lightToDark',
			);
		}

		if (!background) {
			const { BlackBackground } = await import('./core/background-modes');
			background = new BlackBackground();
		}

		await background.render(ctx, config.width, config.height);
		await this.design.renderContent(renderContext);

		return posterCanvas.toBuffer('image/png');
	}

	/**
	 * Create a new Frameify poster generator instance
	 */
	static create<T = any>(): Frameify<T> {
		return new Frameify<T>();
	}
}

// ============================================================================
// Namespaced Exports
// ============================================================================

// Core components
export { PosterDesignBase as PosterDesign, BackgroundModeBase as BackgroundMode };

// Background namespace
export const Backgrounds = BackgroundsImport;

// Designs namespace
export const Designs = {
	Album1: Album1Design,
	Song1: Song1Design,
	SpotifySong: SpotifySongDesign,
};

// Integrations namespace
export const Integrations = {
	Providers: {
		Base: MusicProvider,
		Spotify: SpotifyProvider,
	},
	Fetch: {
		Cover: CoverFetcher,
		Label: LabelFetcher,
		getBestAlbumCover,
		getAllAlbumCovers,
		getAlbumLabel,
	},
	SpotifyCode: {
		getCodeUrl: getSpotifyCodeUrl,
		getTransparentCode: getTransparentSpotifyCode,
		getCodeFromUrl: getSpotifyCodeFromUrl,
		getCodeBuffer: getSpotifyCodeBuffer,
		// Direct access to provider for advanced usage
		Provider: SpotifyProvider,
	},
};

// Types namespace - using object for better compatibility
export const Data = {
	// These are type-only, used for documentation/IDE
} as {
	AlbumData: TypesImport.AlbumData;
	SongData: TypesImport.SongData;
	TrackData: TypesImport.TrackData;
	DiscData: TypesImport.DiscData;
	MusicAlbumData: TypesImport.MusicAlbumData;
	SpotifyTrack: TypesImport.SpotifyTrackData;
	SpotifyAlbum: TypesImport.SpotifyAlbumData;
	AppleMusicTrack: TypesImport.AppleMusicTrackData;
	AppleMusicAlbum: TypesImport.AppleMusicAlbumData;
	YouTubeMusicTrack: TypesImport.YouTubeMusicTrackData;
	YouTubeMusicAlbum: TypesImport.YouTubeMusicAlbumData;
	SoundCloudTrack: TypesImport.SoundCloudTrackData;
	SoundCloudAlbum: TypesImport.SoundCloudAlbumData;
	MusicPlatform: TypesImport.MusicPlatform;
	PosterConfig: TypesImport.PosterConfig;
	BackgroundConfig: TypesImport.BackgroundConfig;
	RenderContext: TypesImport.RenderContext;
	RGB: TypesImport.RGB;
	CoverResult: import('./integrations/covers').CoverResult;
	CoverSearchOptions: import('./integrations/covers').CoverSearchOptions;
	LabelInfo: import('./integrations/label').LabelInfo;
	ReleaseInfo: import('./integrations/label').ReleaseInfo;
};

// Utilities namespace
export const Utils = {
	Color: ColorUtils,
	Canvas: CanvasUtils,
	Music: MusicUtils,
};

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
// Legacy/Convenience Exports (for backwards compatibility)
// ============================================================================

// Re-export main class as PosterGenerator for backwards compatibility
export { Frameify as PosterGenerator };

// Individual exports for tree-shaking
export { Album1Design, Song1Design, SpotifySongDesign };
export { MusicProvider, SpotifyProvider };
export { CoverFetcher, getBestAlbumCover, getAllAlbumCovers };
export { LabelFetcher, getAlbumLabel };
export { getSpotifyCodeUrl, getTransparentSpotifyCode, getSpotifyCodeFromUrl, getSpotifyCodeBuffer };
export * from './core/background-modes';
export * from './utils/color-utils';
export * from './utils/canvas-utils';
export * from './utils/music-utils';

// Re-export all types
export type * from './types';
export type { SpotifySongData } from './designs/spotify-song';
export type { CoverResult, CoverSearchOptions } from './integrations/covers';
export type { LabelInfo, ReleaseInfo } from './integrations/label';
export type { SpotifyCodeOptions } from './integrations/providers/spotify';

// ============================================================================
// Default Export
// ============================================================================

export default Frameify;
