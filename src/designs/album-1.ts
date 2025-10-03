/**
 * Album Design #1 - Classic album poster with track listing
 */

import type { Canvas, CanvasRenderingContext2D } from 'canvas';
import { PosterDesign } from '../core/base';
import type { AlbumData, RenderContext } from '../types';
import { extractColorPalette } from '../utils/color-utils';
import { drawImageWithShadow, drawLine, drawRect, truncateText } from '../utils/canvas-utils';

/**
 * Album Design #1 - Classic album poster design
 */
export class Album1Design extends PosterDesign<AlbumData> {
	private albumCoverSize: number;

	constructor(config: { width?: number; height?: number; margin?: number; textColor?: string; dividerColor?: string; albumCoverSize?: number } = {}) {
		super(config);
		this.albumCoverSize = config.albumCoverSize ?? 2300;
	}

	getName(): string {
		return 'Album Design #1';
	}

	getDescription(): string {
		return 'Classic album poster with cover art, track listing, and color palette';
	}

	validateData(data: AlbumData): void {
		if (!data.coverImagePath) {
			throw new Error('Album cover image path is required');
		}
		if (!data.title) {
			throw new Error('Album title is required');
		}
		if (!data.artist) {
			throw new Error('Album artist is required');
		}

		// Check if we have tracks either in tracks array or discs array
		const hasTracks = (data.tracks && data.tracks.length > 0) ||
			(data.discs && data.discs.length > 0 && data.discs.some(disc => disc.tracks.length > 0));

		if (!hasTracks) {
			throw new Error('At least one track is required');
		}
	}	async prepareRenderContext(data: AlbumData, posterCanvas: Canvas, ctx: CanvasRenderingContext2D): Promise<RenderContext> {
		this.validateData(data);

		// Extract colors from album cover
		console.log('Extracting color palette from album cover...');
		const extractedColors = await extractColorPalette(data.coverImagePath, 5);
		console.log('Color palette:', extractedColors);

		return {
			canvas: posterCanvas,
			ctx,
			config: this.config,
			data,
			extractedColors,
		};
	}

	async renderContent(context: RenderContext): Promise<void> {
		const { ctx, config, data, extractedColors } = context;
		const albumData = data as AlbumData;

		// Draw album cover with shadow
		await drawImageWithShadow(
			ctx,
			albumData.coverImagePath,
			config.margin,
			config.margin,
			this.albumCoverSize,
			this.albumCoverSize,
			{
				offsetX: 0,
				offsetY: 4,
				blur: 100,
				color: 'rgba(0, 0, 0, 0.75)',
			},
		);

		// Calculate positions
		const dividerY = 2640;
		const rightX = config.margin + this.albumCoverSize;

		// Draw divider line
		drawLine(ctx, config.margin, dividerY, rightX, dividerY, config.dividerColor!, 5);

		// Prepare track listing
		// For multi-disc albums, flatten all tracks from all discs
		let allTracks = albumData.tracks;
		if (albumData.discs && albumData.discs.length > 0) {
			allTracks = albumData.discs.flatMap(disc => disc.tracks);
		}

		const trackTitles = allTracks.map(track => this.cleanTrackTitle(track.title));
		
		// Calculate the actual track listing boundary
		const trackBoundary = this.calculateTrackListingBoundary(ctx, trackTitles, config.margin, 1725, 62);
		
		// Calculate dynamic max width for album info based on track boundary
		// Add a 50px gap between track listing and album info
		const albumInfoMaxWidth = rightX - trackBoundary - 50;

		// Draw album info with dynamic width
		this.drawAlbumInfo(ctx, albumData.title, albumData.artist, rightX, 2780, 2860, albumInfoMaxWidth);

		// Draw color palette if we have extracted colors
		if (extractedColors && extractedColors.length > 0) {
			this.drawColorPalette(ctx, extractedColors, 2000, 2980, 100);
		}

		// Draw track listing
		// Bottom section width: 2300px (album cover size)
		// Track listing: 75% = 1725px (suggested), Release info gets remaining space
		this.drawTrackListing(ctx, trackTitles, config.margin, 2780, 1725, 62);

		// Draw release info with dynamic width
		this.drawReleaseInfo(ctx, albumData.releaseDate, albumData.label || albumData.copyright || '', albumData.artist, rightX, 3128, albumInfoMaxWidth);
	}

	/**
	 * Calculate the rightmost boundary of the track listing
	 * This determines where the track text actually ends, not just the allocated space
	 */
	private calculateTrackListingBoundary(
		ctx: CanvasRenderingContext2D,
		tracks: string[],
		startX: number,
		sectionWidth: number,
		_lineHeight: number,
	): number {
		ctx.font = 'bold 52px Ubuntu';
		
		const gapBetweenColumns = 50;
		const maxColumnWidth = (sectionWidth - gapBetweenColumns) / 2;

		// Find longest track in first column
		let maxFirstColumnWidth = 0;
		for (let i = 0; i < 10 && i < tracks.length; i++) {
			const trackText = `${i + 1}. ${tracks[i]}`;
			const truncated = truncateText(ctx, trackText, maxColumnWidth);
			const width = ctx.measureText(truncated).width;
			maxFirstColumnWidth = Math.max(maxFirstColumnWidth, width);
		}

		// Calculate second column position and width
		const secondColumnX = startX + Math.min(maxFirstColumnWidth, maxColumnWidth) + gapBetweenColumns;
		
		// Find longest track in second column
		let maxSecondColumnWidth = 0;
		for (let i = 10; i < 20 && i < tracks.length; i++) {
			const trackText = `${i + 1}. ${tracks[i]}`;
			const truncated = truncateText(ctx, trackText, maxColumnWidth);
			const width = ctx.measureText(truncated).width;
			maxSecondColumnWidth = Math.max(maxSecondColumnWidth, width);
		}

		// Return the rightmost boundary
		// If there's a second column, use its position + width, otherwise use first column
		if (tracks.length > 10) {
			return secondColumnX + maxSecondColumnWidth;
		} else {
			return startX + maxFirstColumnWidth;
		}
	}

	/**
	 * Clean track title by removing featuring credits
	 */
	private cleanTrackTitle(title: string): string {
		// Remove (feat. ...), (ft. ...), (featuring ...), (with ...), etc.
		// Also handles variations with brackets [ ] and different cases
		const patterns = [
			/\s*\(feat\.?\s+[^)]+\)/gi,
			/\s*\(ft\.?\s+[^)]+\)/gi,
			/\s*\(featuring\s+[^)]+\)/gi,
			/\s*\(with\s+[^)]+\)/gi,
			/\s*\[feat\.?\s+[^\]]+\]/gi,
			/\s*\[ft\.?\s+[^\]]+\]/gi,
			/\s*\[featuring\s+[^\]]+\]/gi,
			/\s*\[with\s+[^\]]+\]/gi,
			/\s*feat\.?\s+.+$/gi,
			/\s*ft\.?\s+.+$/gi,
		];

		let cleaned = title;
		for (const pattern of patterns) {
			cleaned = cleaned.replace(pattern, '');
		}

		return cleaned.trim();
	}

	private drawAlbumInfo(
		ctx: CanvasRenderingContext2D,
		title: string,
		artist: string,
		x: number,
		titleY: number,
		artistY: number,
		maxWidth: number,
	): void {
		ctx.fillStyle = this.config.textColor!;
		ctx.textAlign = 'right';
		ctx.textBaseline = 'top';

		// Title - bold
		ctx.font = 'bold 62px Ubuntu';
		const truncatedTitle = truncateText(ctx, title, maxWidth);
		ctx.fillText(truncatedTitle, x, titleY);

		// Artist - regular
		ctx.font = '62px Ubuntu';
		const truncatedArtist = truncateText(ctx, artist, maxWidth);
		ctx.fillText(truncatedArtist, x, artistY);
	}

	private drawColorPalette(
		ctx: CanvasRenderingContext2D,
		colors: string[],
		x: number,
		y: number,
		squareSize: number,
	): void {
		for (let i = 0; i < colors.length; i++) {
			drawRect(ctx, x + (i * squareSize), y, squareSize, squareSize, colors[i], this.config.textColor!, 2);
		}
	}

	private drawTrackListing(
		ctx: CanvasRenderingContext2D,
		tracks: string[],
		startX: number,
		startY: number,
		sectionWidth: number,
		lineHeight: number,
	): void {
		ctx.fillStyle = this.config.textColor!;
		ctx.font = 'bold 52px Ubuntu';
		ctx.textAlign = 'left';
		ctx.textBaseline = 'top';

		const gapBetweenColumns = 50;
		const maxColumnWidth = (sectionWidth - gapBetweenColumns) / 2;

		// Find longest track in first column
		let maxFirstColumnWidth = 0;
		for (let i = 0; i < 10 && i < tracks.length; i++) {
			const trackText = `${i + 1}. ${tracks[i]}`;
			const truncated = truncateText(ctx, trackText, maxColumnWidth);
			const width = ctx.measureText(truncated).width;
			maxFirstColumnWidth = Math.max(maxFirstColumnWidth, width);
		}

		// Calculate second column position
		const secondColumnX = startX + Math.min(maxFirstColumnWidth, maxColumnWidth) + gapBetweenColumns;

		// Draw first column (tracks 1-10)
		for (let i = 0; i < 10 && i < tracks.length; i++) {
			const trackText = `${i + 1}. ${tracks[i]}`;
			const truncated = truncateText(ctx, trackText, maxColumnWidth);
			ctx.fillText(truncated, startX, startY + (i * lineHeight));
		}

		// Draw second column (tracks 11-20)
		for (let i = 10; i < 20 && i < tracks.length; i++) {
			const trackText = `${i + 1}. ${tracks[i]}`;
			const truncated = truncateText(ctx, trackText, maxColumnWidth);
			ctx.fillText(truncated, secondColumnX, startY + ((i - 10) * lineHeight));
		}
	}

	private drawReleaseInfo(
		ctx: CanvasRenderingContext2D,
		releaseDate: string,
		label: string,
		artist: string,
		x: number,
		startY: number,
		maxWidth: number,
	): void {
		ctx.fillStyle = this.config.textColor!;
		ctx.textAlign = 'right';
		ctx.textBaseline = 'top';

		// Format release date (YYYY-MM-DD -> "Month Day, Year")
		const formattedDate = this.formatReleaseDate(releaseDate);

		// "Release Date" - bold
		ctx.font = 'bold 50px Ubuntu';
		const truncatedReleaseDateLabel = truncateText(ctx, 'Release Date', maxWidth);
		ctx.fillText(truncatedReleaseDateLabel, x, startY);

		// Release date - regular
		ctx.font = '50px Ubuntu';
		const truncatedDate = truncateText(ctx, formattedDate, maxWidth);
		ctx.fillText(truncatedDate, x, startY + 66);

		// "Released by" - bold
		ctx.font = 'bold 50px Ubuntu';
		const truncatedReleasedByLabel = truncateText(ctx, 'Released by', maxWidth);
		ctx.fillText(truncatedReleasedByLabel, x, startY + 149);

		// Format copyright with © symbol, year, and label (or artist if no label)
		const year = releaseDate.split('-')[0];
		const copyrightText = label ? `© ${year} ${label}` : `© ${year} ${artist}`;

		// Copyright - regular
		ctx.font = '50px Ubuntu';
		const truncatedCopyright = truncateText(ctx, copyrightText, maxWidth);
		ctx.fillText(truncatedCopyright, x, startY + 215);
	}

	private formatReleaseDate(dateString: string): string {
		// Parse YYYY-MM-DD format
		const [year, month, day] = dateString.split('-').map(Number);

		const months = [
			'January', 'February', 'March', 'April', 'May', 'June',
			'July', 'August', 'September', 'October', 'November', 'December',
		];

		const monthName = months[month - 1] || '';
		return `${monthName} ${day}, ${year}`;
	}
}
