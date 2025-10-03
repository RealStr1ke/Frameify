/**
 * Base provider class for fetching music data without API keys
 */

import axios from 'axios';
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
		// Use minimal headers - Spotify returns meta tags with default headers
		// but serves a JS app with modern browser User-Agents
		const response = await axios.get(url, {
			responseType: 'text',
		});

		return response.data;
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

