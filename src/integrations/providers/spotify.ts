/**
 * Spotify provider - fetches data from Spotify URLs without API keys
 * Uses meta tags from the public Spotify web player
 */

import { MusicProvider } from './base';
import type { SpotifyAlbumData, SpotifyTrackData } from '../../types';

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
}

export class SpotifyProvider extends MusicProvider {
	name = 'Spotify';

	canHandle(url: string): boolean {
		return url.includes('open.spotify.com');
	}

	async fetchTrackData(url: string): Promise<SpotifyTrackData> {
		// Extract track ID from URL
		const trackId = this.extractSpotifyId(url, 'track');
		if (!trackId) {
			throw new Error('Invalid Spotify track URL');
		}

		const trackUrl = `https://open.spotify.com/track/${trackId}`;
		const html = await this.fetchHtml(trackUrl);

		// Extract all meta tags
		const metaTags = this.extractAllMetaTags(html);

		// Parse track metadata using specific meta tag names
		const metadata = this.parseTrackMetadata(metaTags);

		// Build Spotify URI
		const spotifyUri = `spotify:track:${trackId}`;

		// Build Spotify Code URL with default options
		const spotifyCodeUrl = this.buildSpotifyCodeUrl(spotifyUri);

		// Fetch album metadata if album URL is available
		let albumMetadata = null;
		if (metadata.album) {
			albumMetadata = await this.fetchAlbumMetadata(metadata.album);
		}

		return {
			title: metadata.title || 'Unknown',
			artist: metadata.artist || 'Unknown',
			album: albumMetadata?.title || metadata.album,
			albumArtPath: metadata.artworkUrl || '',
			duration: metadata.duration || 0,
			releaseDate: metadata.releaseDate || albumMetadata?.releaseDate,
			copyright: albumMetadata?.copyright,
			platform: 'spotify',
			spotifyId: trackId,
			spotifyUri: spotifyUri,
			spotifyUrl: trackUrl,
			spotifyCodeUrl: spotifyCodeUrl,
		};
	}

	async fetchAlbumData(url: string): Promise<SpotifyAlbumData> {
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

		return {
			coverImagePath: metadata.artworkUrl || '',
			title: metadata.title || 'Unknown',
			artist: metadata.artist || 'Unknown',
			tracks: [], // Can't get track list from meta tags
			releaseDate: metadata.releaseDate || 'Unknown',
			copyright: metadata.copyright || '',
			platform: 'spotify',
			spotifyId: albumId,
			spotifyUri: spotifyUri,
			spotifyUrl: albumUrl,
			spotifyCodeUrl: spotifyCodeUrl,
		};
	}

	/**
	 * Fetch album metadata from album URL (internal helper)
	 */
	private async fetchAlbumMetadata(albumUrl: string): Promise<{ title?: string; releaseDate?: string; copyright?: string; artworkUrl?: string } | null> {
		try {
			const html = await this.fetchHtml(albumUrl);
			const metaTags = this.extractAllMetaTags(html);
			const metadata = this.parseAlbumMetadata(metaTags);
			return metadata;
		} catch (error) {
			console.warn('Failed to fetch album metadata:', error);
			return null;
		}
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
	 * // Default (black bg, white bars, 640px, PNG)
	 * buildSpotifyCodeUrl('spotify:track:xxx')
	 * // => https://scannables.scdn.co/uri/plain/png/000000/white/640/spotify:track:xxx
	 *
	 * // Custom (white bg, black bars, 1280px, JPEG)
	 * buildSpotifyCodeUrl('spotify:track:xxx', {
	 *   bgColor: 'ffffff',
	 *   barColor: 'black',
	 *   size: 1280,
	 *   format: 'jpeg'
	 * })
	 * // => https://scannables.scdn.co/uri/plain/jpeg/ffffff/black/1280/spotify:track:xxx
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
				metadata.title = tag.content;
			} else if (tag.name === 'music:musician_description') {
				// Artist
				metadata.artist = tag.content;
			} else if (tag.name === 'music:release_date') {
				// Release date
				metadata.releaseDate = tag.content;
			} else if (tag.property === 'og:title' && !metadata.title) {
				// Title fallback (from og:title)
				metadata.title = tag.content;
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
			copyright: undefined as string | undefined,
			releaseDate: undefined as string | undefined,
		};

		for (const tag of metaTags) {
			// Artwork URL
			if (tag.property === 'og:image') {
				metadata.artworkUrl = tag.content;
			} else if (tag.property === 'og:title') {
				// Title
				metadata.title = tag.content;
			} else if (tag.property === 'og:description') {
				// Copyright/description
				metadata.copyright = tag.content;
			} else if (tag.name === 'music:release_date') {
				// Release date
				metadata.releaseDate = tag.content;
			} else if (tag.name === 'music:musician_description') {
				// Artist (fallback)
				metadata.artist = tag.content;
			}
		}

		return metadata;
	}
}
