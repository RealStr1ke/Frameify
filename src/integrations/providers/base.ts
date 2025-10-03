/**
 * Base provider class for fetching music data without API keys
 */

import type { MusicAlbumData } from '../../types';

export abstract class MusicProvider {
	abstract name: string;

	/**
	 * Check if this provider can handle the given URL
	 */
	abstract canHandle(url: string): boolean;

	/**
	 * Fetch music data from URL (always returns full album with track list)
	 * For track URLs: fetches parent album and includes all tracks
	 * For album URLs: fetches album and all tracks
	 */
	abstract fetchData(url: string): Promise<MusicAlbumData>;

	/**
	 * Fetch HTML with proper headers
	 */
	protected async fetchHtml(url: string): Promise<string> {
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0',
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.5',
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch ${url}: ${response.status}`);
		}

		return response.text();
	}

	/**
	 * Extract JSON-LD structured data
	 */
	protected extractJsonLd(html: string): any {
		const match = html.match(/<script type="application\/ld\+json">(.+?)<\/script>/s);
		return match ? JSON.parse(match[1]) : null;
	}

	/**
	 * Parse ISO 8601 duration (PT3M45S -> 225 seconds)
	 */
	protected parseIsoDuration(duration: string): number {
		const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
		const hours = parseInt(match?.[1] || '0');
		const minutes = parseInt(match?.[2] || '0');
		const seconds = parseInt(match?.[3] || '0');
		return hours * 3600 + minutes * 60 + seconds;
	}
}

