/**
 * Album cover artwork fetcher
 * Uses Music Hoarders API to fetch high-resolution covers from multiple sources
 */

export interface CoverResult {
	smallCoverUrl: string;
	bigCoverUrl: string;
	altCoverUrl?: string;
	releaseInfo: {
		title: string;
		artist: string;
		date?: string;
		tracks?: number;
		barcode?: string;
		url?: string;
	};
	source: string;
}

export interface CoverSearchOptions {
	artist: string;
	album: string;
	country?: string;
	sources?: string[];
}

type StreamMessage =
	| { type: 'source'; source: string }
	| { type: 'count'; releaseCount: number; source: string }
	| { type: 'cover'; smallCoverUrl: string; bigCoverUrl: string; altCoverUrl?: string; releaseInfo: any; source: string }
	| { type: 'done'; success: boolean; source: string };

export class CoverFetcher {
	private static readonly API_URL = 'https://covers.musichoarders.xyz/api/search';
	private static readonly DEFAULT_SOURCES = [
		'amazonmusic',
		'applemusic',
		'bandcamp',
		'deezer',
		'itunes',
		'lastfm',
		'soundcloud',
		'spotify',
		'tidal',
	];

	/**
	 * Generate a random session ID for the API
	 */
	private generateSessionId(): string {
		const chars = '0123456789abcdef';
		let sessionId = '';
		for (let i = 0; i < 32; i++) {
			sessionId += chars[Math.floor(Math.random() * chars.length)];
		}
		return sessionId;
	}

	/**
	 * Search for album covers from multiple sources
	 */
	async searchCovers(options: CoverSearchOptions): Promise<CoverResult[]> {
		const { artist, album, country = 'us', sources = CoverFetcher.DEFAULT_SOURCES } = options;

		const body = JSON.stringify({
			artist,
			album,
			country,
			sources,
		});

		try {
			const response = await fetch(CoverFetcher.API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0',
					'Accept': '*/*',
					'Accept-Language': 'en-US,en;q=0.5',
					'x-page-query': '',
					'x-page-referrer': '',
					'x-session': this.generateSessionId(),
					'Sec-Fetch-Dest': 'empty',
					'Sec-Fetch-Mode': 'cors',
					'Sec-Fetch-Site': 'same-origin',
				},
				referrer: 'https://covers.musichoarders.xyz/',
				body,
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const text = await response.text();
			return this.parseStreamResponse(text);
		} catch (error) {
			console.error('Error fetching covers:', error);
			throw error;
		}
	}

	/**
	 * Get the best quality cover from search results
	 * Prioritizes sources known for high quality images
	 * Filters out non-image files (videos, etc.)
	 */
	getBestCover(results: CoverResult[]): CoverResult | null {
		if (results.length === 0) return null;

		// Filter out non-image URLs (videos, etc.)
		const imageResults = results.filter(result => this.isImageUrl(result.bigCoverUrl));

		if (imageResults.length === 0) return null;

		// Priority order for sources (best quality first)
		const sourcePriority = [
			'tidal', // Known for high-res images
			'applemusic', // High quality
			'deezer', // High quality
			'amazonmusic',
			'spotify',
			'itunes',
			'bandcamp',
			'soundcloud',
			'lastfm',
		];

		// Sort results by source priority
		const sorted = [...imageResults].sort((a, b) => {
			const aPriority = sourcePriority.indexOf(a.source);
			const bPriority = sourcePriority.indexOf(b.source);

			// If source not in priority list, put it at the end
			const aIndex = aPriority === -1 ? sourcePriority.length : aPriority;
			const bIndex = bPriority === -1 ? sourcePriority.length : bPriority;

			return aIndex - bIndex;
		});

		return sorted[0];
	}

	/**
	 * Check if a URL points to an image file
	 */
	private isImageUrl(url: string): boolean {
		// Check file extension
		const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.svg'];
		const lowerUrl = url.toLowerCase();

		// Check for explicit image extensions
		if (imageExtensions.some(ext => lowerUrl.includes(ext))) {
			return true;
		}

		// Filter out known video formats
		const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.m4v', '.mkv'];
		if (videoExtensions.some(ext => lowerUrl.includes(ext))) {
			return false;
		}

		// Filter out video streaming URLs
		if (lowerUrl.includes('hlsvideo') || lowerUrl.includes('hlsmusic')) {
			return false;
		}

		// If no extension detected but from known image CDN, assume it's an image
		const imageCdns = [
			'scdn.co/image',
			'mzstatic.com/image',
			'dzcdn.net/images',
			'bcbits.com/img',
			'media-amazon.com/images',
			'tidal.com/images',
		];

		if (imageCdns.some(cdn => lowerUrl.includes(cdn))) {
			return true;
		}

		// Default: assume it's an image if we can't determine
		return true;
	}

	/**
	 * Get all covers grouped by source
	 */
	getCoversBySource(results: CoverResult[]): Map<string, CoverResult[]> {
		const bySource = new Map<string, CoverResult[]>();

		for (const result of results) {
			const existing = bySource.get(result.source) || [];
			existing.push(result);
			bySource.set(result.source, existing);
		}

		return bySource;
	}

	/**
	 * Parse the streaming response from the API
	 * Each line is a JSON object
	 */
	private parseStreamResponse(text: string): CoverResult[] {
		const lines = text.trim().split('\n');
		const covers: CoverResult[] = [];

		for (const line of lines) {
			if (!line.trim()) continue;

			try {
				const message: StreamMessage = JSON.parse(line);

				if (message.type === 'cover') {
					covers.push({
						smallCoverUrl: message.smallCoverUrl,
						bigCoverUrl: message.bigCoverUrl,
						altCoverUrl: message.altCoverUrl,
						releaseInfo: message.releaseInfo,
						source: message.source,
					});
				}
			} catch (error) {
				console.warn('Failed to parse line:', line, error);
			}
		}

		return covers;
	}

	/**
	 * Download cover image to a local path
	 */
	async downloadCover(url: string, outputPath: string): Promise<void> {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to download cover: ${response.status}`);
		}

		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		const fs = await import('fs/promises');
		await fs.writeFile(outputPath, buffer);
	}

	/**
	 * Get cover URL with specific size (for services that support it)
	 */
	getCoverWithSize(result: CoverResult, size: number): string {
		const { bigCoverUrl, source } = result;

		// Spotify: Use different size endpoint
		if (source === 'spotify' && bigCoverUrl.includes('i.scdn.co')) {
			// Spotify format: /image/[hash]/[size]x[size].jpg
			return bigCoverUrl.replace(/\/[0-9]+x[0-9]+/, `/${size}x${size}`);
		}

		// Apple Music: Can request different sizes
		if (source === 'applemusic' && bigCoverUrl.includes('mzstatic.com')) {
			// Replace size in URL if present
			return bigCoverUrl.replace(/\/[0-9]+x[0-9]+w/, `/${size}x${size}w`);
		}

		// Deezer: Can specify size
		if (source === 'deezer' && bigCoverUrl.includes('dzcdn.net')) {
			return bigCoverUrl.replace(/\/[0-9]+x[0-9]+/, `/${size}x${size}`);
		}

		// For others, return the big cover URL
		return bigCoverUrl;
	}
}

/**
 * Helper function to quickly get the best cover for an album
 */
export async function getBestAlbumCover(artist: string, album: string): Promise<CoverResult | null> {
	const fetcher = new CoverFetcher();
	const results = await fetcher.searchCovers({ artist, album });
	return fetcher.getBestCover(results);
}

/**
 * Helper function to get all covers for an album
 */
export async function getAllAlbumCovers(artist: string, album: string): Promise<CoverResult[]> {
	const fetcher = new CoverFetcher();
	return fetcher.searchCovers({ artist, album });
}
