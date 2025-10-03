/**
 * Label fetcher - retrieves record label information for albums
 * Uses MusicBrainz API to fetch comprehensive label data
 */

import axios from 'axios';

export interface LabelInfo {
	name: string;
	catalogNumber?: string;
	country?: string;
	type?: string; // e.g., "Original Production", "Reissue"
	barcode?: string;
}

export interface ReleaseInfo {
	title: string;
	artist: string;
	releaseDate?: string;
	labels: LabelInfo[];
	barcode?: string;
}

export class LabelFetcher {
	private static readonly MUSICBRAINZ_API = 'https://musicbrainz.org/ws/2';
	private static readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0';

	/**
	 * Search for release by artist and album name
	 */
	async searchRelease(artist: string, album: string): Promise<ReleaseInfo | null> {
		try {
			// Step 1: Search for the release
			const searchUrl = new URL(`${LabelFetcher.MUSICBRAINZ_API}/release`);
			searchUrl.searchParams.set('query', `artist:"${artist}" AND release:"${album}"`);
			searchUrl.searchParams.set('fmt', 'json');
			searchUrl.searchParams.set('limit', '5');

			const searchResponse = await axios.get(searchUrl.toString(), {
				headers: {
					'User-Agent': LabelFetcher.USER_AGENT,
					'Accept': 'application/json',
				},
			});

			const searchData = searchResponse.data;

			if (!searchData.releases || searchData.releases.length === 0) {
				return null;
			}

			// Get the first (best match) release
			const release = searchData.releases[0];
			const releaseId = release.id;

			// Step 2: Get detailed release info including labels
			return await this.getReleaseDetails(releaseId);
		} catch (error) {
			console.error('Error searching MusicBrainz:', error);
			return null;
		}
	}

	/**
	 * Get release details by MusicBrainz ID
	 */
	async getReleaseDetails(releaseId: string): Promise<ReleaseInfo | null> {
		try {
			// Rate limiting - MusicBrainz allows 1 request per second
			await this.delay(1000);

			const detailUrl = `${LabelFetcher.MUSICBRAINZ_API}/release/${releaseId}?inc=labels&fmt=json`;

			const response = await axios.get(detailUrl, {
				headers: {
					'User-Agent': LabelFetcher.USER_AGENT,
					'Accept': 'application/json',
				},
			});

			const data = response.data;

			// Extract label information
			const labels: LabelInfo[] = (data['label-info'] || []).map((labelInfo: any) => ({
				name: labelInfo.label?.name || 'Unknown',
				catalogNumber: labelInfo['catalog-number'],
			}));

			return {
				title: data.title,
				artist: data['artist-credit']?.[0]?.name || 'Unknown',
				releaseDate: data.date,
				labels,
				barcode: data.barcode,
			};
		} catch (error) {
			console.error('Error fetching release details:', error);
			return null;
		}
	}

	/**
	 * Search for release by barcode (most accurate)
	 */
	async searchByBarcode(barcode: string): Promise<ReleaseInfo | null> {
		try {
			const searchUrl = new URL(`${LabelFetcher.MUSICBRAINZ_API}/release`);
			searchUrl.searchParams.set('query', `barcode:${barcode}`);
			searchUrl.searchParams.set('fmt', 'json');
			searchUrl.searchParams.set('limit', '1');

			const searchResponse = await axios.get(searchUrl.toString(), {
				headers: {
					'User-Agent': LabelFetcher.USER_AGENT,
					'Accept': 'application/json',
				},
			});

			const searchData = searchResponse.data;

			if (!searchData.releases || searchData.releases.length === 0) {
				return null;
			}

			const releaseId = searchData.releases[0].id;
			return await this.getReleaseDetails(releaseId);
		} catch (error) {
			console.error('Error searching by barcode:', error);
			return null;
		}
	}

	/**
	 * Get label info from album data
	 * Tries barcode first (most accurate), then falls back to artist/album search
	 */
	async getLabel(options: { artist: string; album: string; barcode?: string }): Promise<LabelInfo | null> {
		const { artist, album, barcode } = options;

		let releaseInfo: ReleaseInfo | null = null;

		// Try barcode first if available
		if (barcode) {
			releaseInfo = await this.searchByBarcode(barcode);
		}

		// Fall back to artist/album search
		if (!releaseInfo) {
			releaseInfo = await this.searchRelease(artist, album);
		}

		if (!releaseInfo || releaseInfo.labels.length === 0) {
			return null;
		}

		// Return the first (primary) label
		return releaseInfo.labels[0];
	}

	/**
	 * Simple delay helper for rate limiting
	 */
	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

/**
 * Helper function to quickly get label for an album
 */
export async function getAlbumLabel(artist: string, album: string, barcode?: string): Promise<string | null> {
	const fetcher = new LabelFetcher();
	const labelInfo = await fetcher.getLabel({ artist, album, barcode });
	return labelInfo?.name || null;
}
