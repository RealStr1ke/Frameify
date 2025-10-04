/**
 * Spotify provider - fetches data from Spotify URLs without API keys
 * Uses meta tags from the public Spotify web player
 */

import { MusicProvider } from './base';
import type { SpotifyAlbumData, SpotifyTrackData, DiscData } from '../../types';

interface MetaTag {
	name?: string;
	property?: string;
	content?: string;
}

export interface SpotifyCodeOptions {
	/** Background color in hex format (without #). Default: '000000' (black) */
	bgColor?: string;
	/** Bar/code color: 'white' or 'black'. Default: 'white' */
	barColor?: 'white' | 'black';
	/** Image size in pixels. Default: 1280 */
	size?: number;
	/** Image format: 'jpeg', 'png', or 'svg'. Default: 'svg' */
	format?: 'jpeg' | 'png' | 'svg';
	/** Remove background for transparency (SVG only). Default: false */
	transparent?: boolean;
}

export class SpotifyProvider extends MusicProvider {
	name = 'Spotify';

	canHandle(url: string): boolean {
		// Remove query parameters (like ?si=...) before checking
		const cleanUrl = url.split('?')[0];
		return cleanUrl.includes('open.spotify.com');
	}

	async fetchData(url: string): Promise<SpotifyAlbumData> {
		// Clean URL by removing query parameters
		const cleanUrl = url.split('?')[0];

		// Determine if this is a track or album URL
		if (cleanUrl.includes('/track/')) {
			return this.fetchFromTrackUrl(cleanUrl);
		} else if (cleanUrl.includes('/album/')) {
			return this.fetchFromAlbumUrl(cleanUrl);
		} else {
			throw new Error('Invalid Spotify URL - must be a track or album URL');
		}
	}

	/**
	 * Fetch track data directly (for song posters)
	 * This fetches the full album data but returns track-specific info
	 */
	async fetchTrackData(url: string): Promise<SpotifyTrackData & { album?: SpotifyAlbumData }> {
		// Clean URL by removing query parameters
		const cleanUrl = url.split('?')[0];

		// Extract track ID from URL
		const trackId = this.extractSpotifyId(cleanUrl, 'track');
		if (!trackId) {
			throw new Error('Invalid Spotify track URL');
		}

		const trackUrl = `https://open.spotify.com/track/${trackId}`;
		const html = await this.fetchHtml(trackUrl);

		// Extract all meta tags
		const metaTags = this.extractAllMetaTags(html);

		// Parse track metadata
		const trackMetadata = this.parseTrackMetadata(metaTags);

		if (!trackMetadata.title || !trackMetadata.artist || !trackMetadata.artworkUrl) {
			throw new Error('Could not extract required track metadata');
		}

		// Build Spotify URI and Code URL for the track
		const spotifyUri = `spotify:track:${trackId}`;
		const spotifyCodeUrl = this.buildSpotifyCodeUrl(spotifyUri);

		// Fetch the full album data
		let albumData: SpotifyAlbumData | undefined;
		if (trackMetadata.album) {
			try {
				albumData = await this.fetchFromAlbumUrl(trackMetadata.album);
			} catch (error) {
				console.warn('Could not fetch album data:', error);
			}
		}

		// Return track data with album reference
		return {
			platform: 'spotify',
			spotifyId: trackId,
			spotifyUri,
			spotifyUrl: trackUrl,
			spotifyCodeUrl,
			title: trackMetadata.title,
			artist: trackMetadata.artist,
			duration: trackMetadata.duration || 0,
			albumArtPath: trackMetadata.artworkUrl,
			releaseDate: trackMetadata.releaseDate,
			album: albumData, // Include full album data
		};
	}

	/**
	 * Fetch album data from a track URL
	 */
	private async fetchFromTrackUrl(url: string): Promise<SpotifyAlbumData> {
		// Extract track ID from URL
		const trackId = this.extractSpotifyId(url, 'track');
		if (!trackId) {
			throw new Error('Invalid Spotify track URL');
		}

		const trackUrl = `https://open.spotify.com/track/${trackId}`;
		const html = await this.fetchHtml(trackUrl);

		// Extract all meta tags
		const metaTags = this.extractAllMetaTags(html);

		// Parse track metadata to get album URL
		const metadata = this.parseTrackMetadata(metaTags);

		if (!metadata.album) {
			throw new Error('Could not find album URL from track metadata');
		}

		// Fetch the full album data
		return this.fetchFromAlbumUrl(metadata.album);
	}

	/**
	 * Fetch album data from an album URL
	 */
	private async fetchFromAlbumUrl(url: string): Promise<SpotifyAlbumData> {
		// Extract album ID from URL
		const albumId = this.extractSpotifyId(url, 'album');
		if (!albumId) {
			throw new Error('Invalid Spotify album URL');
		}

		const albumUrl = `https://open.spotify.com/album/${albumId}`;
		const html = await this.fetchHtml(albumUrl);

		// Extract all meta tags
		const metaTags = this.extractAllMetaTags(html);

		// Parse album metadata
		const metadata = this.parseAlbumMetadata(metaTags);

		// Build Spotify URI
		const spotifyUri = `spotify:album:${albumId}`;

		// Build Spotify Code URL
		const spotifyCodeUrl = this.buildSpotifyCodeUrl(spotifyUri);

		// Extract track list from meta tags
		const tracks = await this.extractTrackList(metaTags, metadata.releaseDate);

		// Organize tracks by disc if multi-disc
		const totalDiscs = this.getTotalDiscs(metaTags);
		const albumData: SpotifyAlbumData = {
			coverImagePath: metadata.artworkUrl || '',
			title: metadata.title || 'Unknown',
			artist: metadata.artist || 'Unknown',
			tracks: totalDiscs > 1 ? [] : tracks,
			releaseDate: metadata.releaseDate || 'Unknown',
			platform: 'spotify',
			spotifyId: albumId,
			spotifyUri: spotifyUri,
			spotifyUrl: albumUrl,
			spotifyCodeUrl: spotifyCodeUrl,
		};

		// If multi-disc, organize into discs array
		if (totalDiscs > 1) {
			albumData.discs = this.organizeTracksIntoDiscs(tracks, totalDiscs);
			albumData.totalDiscs = totalDiscs;
		}

		albumData.totalTracks = tracks.length;

		return albumData;
	}

	/**
	 * Build Spotify Code URL with customizable options
	 * Format: https://scannables.scdn.co/uri/plain/{format}/{bgColor}/{barColor}/{size}/{spotifyUri}
	 *
	 * @param spotifyUri - The Spotify URI (e.g., 'spotify:track:xxx')
	 * @param options - Customization options for the code
	 * @returns Complete Spotify Code URL
	 *
	 * @example
	 * ```ts
	 * // Default (black bg, white bars, 1280px, SVG)
	 * buildSpotifyCodeUrl('spotify:track:xxx')
	 * // => https://scannables.scdn.co/uri/plain/svg/000000/white/1280/spotify:track:xxx
	 *
	 * // White bg with black bars
	 * buildSpotifyCodeUrl('spotify:track:xxx', {
	 *   bgColor: 'ffffff',
	 *   barColor: 'black',
	 *   size: 1280,
	 *   format: 'svg'
	 * })
	 * // => https://scannables.scdn.co/uri/plain/svg/ffffff/black/1280/spotify:track:xxx
	 *
	 * // Transparent (for designs)
	 * buildSpotifyCodeUrl('spotify:track:xxx', { transparent: true })
	 * ```
	 */
	buildSpotifyCodeUrl(spotifyUri: string, options: SpotifyCodeOptions = {}): string {
		const {
			bgColor = '000000',
			barColor = 'white',
			size = 1280,
			format = 'svg',
		} = options;

		// Remove # from bgColor if present
		const cleanBgColor = bgColor.replace('#', '');

		return `https://scannables.scdn.co/uri/plain/${format}/${cleanBgColor}/${barColor}/${size}/${spotifyUri}`;
	}

	/**
	 * Download Spotify code as SVG with optional transparency
	 *
	 * @param spotifyUri - The Spotify URI
	 * @param options - Code customization options
	 * @returns SVG content as string
	 */
	async downloadSpotifyCodeSvg(spotifyUri: string, options: SpotifyCodeOptions = {}): Promise<string> {
		const url = this.buildSpotifyCodeUrl(spotifyUri, { ...options, format: 'svg' });
		const response = await fetch(url);
		let svg = await response.text();

		// Remove background for transparency if requested
		if (options.transparent) {
			svg = this.removeSpotifyCodeBackground(svg);
		}

		return svg;
	}

	/**
	 * Download Spotify code as buffer (PNG/JPEG)
	 *
	 * @param spotifyUri - The Spotify URI
	 * @param options - Code customization options
	 * @returns Image buffer
	 */
	async downloadSpotifyCodeBuffer(spotifyUri: string, options: SpotifyCodeOptions = {}): Promise<Buffer> {
		const format = options.format || 'png';
		if (format === 'svg') {
			throw new Error('Use downloadSpotifyCodeSvg() for SVG format');
		}

		const url = this.buildSpotifyCodeUrl(spotifyUri, { ...options, format });
		const response = await fetch(url);
		const arrayBuffer = await response.arrayBuffer();
		return Buffer.from(arrayBuffer);
	}

	/**
	 * Convert Spotify URL to URI
	 *
	 * @param url - Spotify URL (e.g., 'https://open.spotify.com/track/xxx')
	 * @returns Spotify URI (e.g., 'spotify:track:xxx')
	 */
	urlToUri(url: string): string {
		const cleanUrl = url.split('?')[0];
		const match = cleanUrl.match(/spotify\.com\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/);
		if (!match) {
			throw new Error('Invalid Spotify URL');
		}
		const [, type, id] = match;
		return `spotify:${type}:${id}`;
	}

	/**
	 * Convert Spotify URI to URL
	 *
	 * @param uri - Spotify URI (e.g., 'spotify:track:xxx')
	 * @returns Spotify URL (e.g., 'https://open.spotify.com/track/xxx')
	 */
	uriToUrl(uri: string): string {
		const match = uri.match(/spotify:(track|album|playlist|artist):([a-zA-Z0-9]+)/);
		if (!match) {
			throw new Error('Invalid Spotify URI');
		}
		const [, type, id] = match;
		return `https://open.spotify.com/${type}/${id}`;
	}

	/**
	 * Remove background from Spotify code SVG for transparency
	 *
	 * @param svg - Original SVG content
	 * @returns SVG with background removed
	 */
	private removeSpotifyCodeBackground(svg: string): string {
		// Remove the first <rect> which is always the background
		return svg.replace(/<rect x="0" y="0" width="\d+" height="\d+" fill="#[0-9a-fA-F]+"\/>/, '');
	}

	/**
	 * Extract Spotify ID from URL
	 */
	private extractSpotifyId(url: string, type: 'track' | 'album'): string | null {
		// Remove query parameters
		const cleanUrl = url.split('?')[0];

		// Match pattern: https://open.spotify.com/{type}/{id}
		const regex = new RegExp(`https://open\\.spotify\\.com/${type}/([a-zA-Z0-9]+)`);
		const match = cleanUrl.match(regex);

		return match ? match[1] : null;
	}

	/**
	 * Extract Open Graph meta tag (Spotify-specific)
	 */
	private extractMetaTag(html: string, property: string): string | undefined {
		const regex = new RegExp(`<meta property="${property}" content="([^"]+)"`, 'i');
		return html.match(regex)?.[1];
	}

	/**
	 * Extract regular meta tag (Spotify-specific)
	 */
	private extractNameMetaTag(html: string, name: string): string | undefined {
		const regex = new RegExp(`<meta name="${name}" content="([^"]+)"`, 'i');
		return html.match(regex)?.[1];
	}

	/**
	 * Extract artist from title (handles "Artist - Song" format)
	 */
	private extractArtistFromTitle(title: string): string {
		const match = title.match(/^([^-]+)\s*-\s*(.+)$/);
		return match ? match[1].trim() : '';
	}

	/**
	 * Extract song from title (handles "Artist - Song" format)
	 */
	private extractSongFromTitle(title: string): string {
		const match = title.match(/^([^-]+)\s*-\s*(.+)$/);
		return match ? match[2].trim() : title;
	}

	/**
	 * Decode HTML entities (e.g., &#x27; to ', &amp; to &, etc.)
	 */
	private decodeHtmlEntities(text: string | undefined): string | undefined {
		if (!text) return text;

		return text
			.replace(/&#x27;/g, '\'')
			.replace(/&#39;/g, '\'')
			.replace(/&quot;/g, '"')
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
			.replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
	}

	/**
	 * Extract all meta tags from HTML
	 */
	private extractAllMetaTags(html: string): MetaTag[] {
		const metaTags: MetaTag[] = [];
		const metaRegex = /<meta\s+([^>]+)>/gi;
		let match;

		while ((match = metaRegex.exec(html)) !== null) {
			const attributes = match[1];
			const tag: MetaTag = {};

			// Extract name attribute
			const nameMatch = attributes.match(/name=["']([^"']+)["']/i);
			if (nameMatch) tag.name = nameMatch[1];

			// Extract property attribute
			const propertyMatch = attributes.match(/property=["']([^"']+)["']/i);
			if (propertyMatch) tag.property = propertyMatch[1];

			// Extract content attribute
			const contentMatch = attributes.match(/content=["']([^"']+)["']/i);
			if (contentMatch) tag.content = contentMatch[1];

			metaTags.push(tag);
		}

		return metaTags;
	}

	/**
	 * Parse track metadata from meta tags
	 */
	private parseTrackMetadata(metaTags: MetaTag[]) {
		const metadata = {
			artworkUrl: undefined as string | undefined,
			duration: undefined as number | undefined,
			album: undefined as string | undefined,
			title: undefined as string | undefined,
			artist: undefined as string | undefined,
			releaseDate: undefined as string | undefined,
		};

		for (const tag of metaTags) {
			// Artwork URL
			if (tag.property === 'og:image') {
				metadata.artworkUrl = tag.content;
			} else if (tag.name === 'music:duration') {
				// Duration (in seconds)
				metadata.duration = tag.content ? parseInt(tag.content) : undefined;
			} else if (tag.name === 'music:album') {
				// Album URL
				metadata.album = tag.content;
			} else if (tag.name === 'music:song') {
				// Title (from music:song)
				const rawTitle = this.decodeHtmlEntities(tag.content);
				// Remove "- Single by <artist>" pattern
				metadata.title = rawTitle?.replace(/\s*-\s*Single\s+by\s+.+$/i, '');
			} else if (tag.name === 'music:musician_description') {
				// Artist
				metadata.artist = this.decodeHtmlEntities(tag.content);
			} else if (tag.name === 'music:release_date') {
				// Release date
				metadata.releaseDate = tag.content;
			} else if (tag.property === 'og:title' && !metadata.title) {
				// Title fallback (from og:title)
				const rawTitle = this.decodeHtmlEntities(tag.content);
				// Remove "- Single by <artist>" pattern
				metadata.title = rawTitle?.replace(/\s*-\s*Single\s+by\s+.+$/i, '');
			}
		}

		return metadata;
	}

	/**
	 * Parse album metadata from meta tags
	 */
	private parseAlbumMetadata(metaTags: MetaTag[]) {
		const metadata = {
			artworkUrl: undefined as string | undefined,
			title: undefined as string | undefined,
			artist: undefined as string | undefined,
			artistUrl: undefined as string | undefined,
			releaseDate: undefined as string | undefined,
		};

		for (const tag of metaTags) {
			// Artwork URL
			if (tag.property === 'og:image') {
				metadata.artworkUrl = tag.content;
			} else if (tag.property === 'og:title') {
				// Title (format: "ALBUM_NAME - Album by ARTIST | Spotify" or "ALBUM_NAME")
				let title = tag.content;
				if (title) {
					// Remove " - Album by [Artist] | Spotify" suffix
					title = title.replace(/\s*-\s*Album by .* \| Spotify$/i, '');
					// Also handle single format: "ALBUM_NAME | Spotify"
					title = title.replace(/\s*\|\s*Spotify$/i, '');
					metadata.title = this.decodeHtmlEntities(title.trim());
				}
			} else if (tag.property === 'og:description') {
				// Description format: "Artist · album · YYYY · N songs"
				// Extract artist from description if not already set
				if (!metadata.artist && tag.content) {
					const parts = tag.content.split('·').map(p => p.trim());
					if (parts.length > 0) {
						metadata.artist = this.decodeHtmlEntities(parts[0]);
					}
				}
			} else if (tag.name === 'music:release_date') {
				// Release date
				metadata.releaseDate = tag.content;
			} else if (tag.name === 'music:musician') {
				// Artist URL (first one is primary artist)
				if (!metadata.artistUrl) {
					metadata.artistUrl = tag.content;
				}
			}
		}

		return metadata;
	}

	/**
	 * Extract track list from album meta tags
	 */
	private async extractTrackList(metaTags: MetaTag[], albumReleaseDate?: string): Promise<SpotifyTrackData[]> {
		const tracks: SpotifyTrackData[] = [];
		const trackMap = new Map<string, { disc: number; track: number }>();

		// First pass: collect track URLs with their disc/track numbers
		for (let i = 0; i < metaTags.length; i++) {
			const tag = metaTags[i];

			if (tag.name === 'music:song' && tag.content) {
				const trackUrl = tag.content;
				const discTag = metaTags[i + 1];
				const trackTag = metaTags[i + 2];

				const discNumber = discTag?.name === 'music:song:disc' ? parseInt(discTag.content || '1') : 1;
				const trackNumber = trackTag?.name === 'music:song:track' ? parseInt(trackTag.content || '0') : 0;

				trackMap.set(trackUrl, { disc: discNumber, track: trackNumber });
			}
		}

		// Second pass: fetch metadata for each track
		for (const [trackUrl, position] of trackMap.entries()) {
			try {
				const trackHtml = await this.fetchHtml(trackUrl);
				const trackMetaTags = this.extractAllMetaTags(trackHtml);
				const trackMetadata = this.parseTrackMetadata(trackMetaTags);

				const trackId = this.extractSpotifyId(trackUrl, 'track');
				if (!trackId) continue;

				const spotifyUri = `spotify:track:${trackId}`;

				tracks.push({
					title: trackMetadata.title || 'Unknown',
					artist: trackMetadata.artist || 'Unknown',
					duration: trackMetadata.duration || 0,
					trackNumber: position.track,
					discNumber: position.disc,
					releaseDate: trackMetadata.releaseDate || albumReleaseDate,
					platform: 'spotify',
					spotifyId: trackId,
					spotifyUri: spotifyUri,
					spotifyUrl: trackUrl,
					spotifyCodeUrl: this.buildSpotifyCodeUrl(spotifyUri),
				});
			} catch (error) {
				console.warn(`Failed to fetch track metadata for ${trackUrl}:`, error);
			}
		}

		return tracks;
	}

	/**
	 * Get total number of discs from meta tags
	 */
	private getTotalDiscs(metaTags: MetaTag[]): number {
		let maxDisc = 1;

		for (const tag of metaTags) {
			if (tag.name === 'music:song:disc' && tag.content) {
				const discNum = parseInt(tag.content);
				if (discNum > maxDisc) {
					maxDisc = discNum;
				}
			}
		}

		return maxDisc;
	}

	/**
	 * Organize tracks into discs for multi-disc albums
	 */
	private organizeTracksIntoDiscs(tracks: SpotifyTrackData[], totalDiscs: number): DiscData[] {
		const discs: DiscData[] = [];

		for (let discNum = 1; discNum <= totalDiscs; discNum++) {
			const discTracks = tracks.filter(track => track.discNumber === discNum);

			discs.push({
				discNumber: discNum,
				tracks: discTracks,
			});
		}

		return discs;
	}
}

// ============================================================================
// Spotify Code Helper Functions (for convenient access)
// ============================================================================

/**
 * Create a SpotifyProvider instance for code generation
 */
const spotifyProvider = new SpotifyProvider();

/**
 * Generate Spotify code URL from Spotify URI
 */
export function getSpotifyCodeUrl(spotifyUri: string, options?: SpotifyCodeOptions): string {
	return spotifyProvider.buildSpotifyCodeUrl(spotifyUri, options);
}

/**
 * Generate transparent Spotify code SVG (for design overlays)
 */
export async function getTransparentSpotifyCode(spotifyUri: string, barColor: 'white' | 'black' = 'white'): Promise<string> {
	return spotifyProvider.downloadSpotifyCodeSvg(spotifyUri, {
		transparent: true,
		barColor,
		format: 'svg',
	});
}

/**
 * Generate Spotify code URL from Spotify URL
 */
export function getSpotifyCodeFromUrl(spotifyUrl: string, options?: SpotifyCodeOptions): string {
	const uri = spotifyProvider.urlToUri(spotifyUrl);
	return spotifyProvider.buildSpotifyCodeUrl(uri, options);
}

/**
 * Get Spotify code as buffer for canvas rendering
 */
export async function getSpotifyCodeBuffer(spotifyUri: string, options?: SpotifyCodeOptions): Promise<Buffer> {
	return spotifyProvider.downloadSpotifyCodeBuffer(spotifyUri, options);
}
