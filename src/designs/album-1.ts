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
		if (!data.tracks || data.tracks.length === 0) {
			throw new Error('At least one track is required');
		}
	}

	async prepareRenderContext(data: AlbumData, posterCanvas: Canvas, ctx: CanvasRenderingContext2D): Promise<RenderContext> {
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

		// Draw album info
		this.drawAlbumInfo(ctx, albumData.title, albumData.artist, rightX, 2780, 2860);

		// Draw color palette if we have extracted colors
		if (extractedColors && extractedColors.length > 0) {
			this.drawColorPalette(ctx, extractedColors, 2000, 2980, 100);
		}

		// Draw track listing
		const trackTitles = albumData.tracks.map(track => track.title);
		this.drawTrackListing(ctx, trackTitles, config.margin, 2780, 1150, 62);

		// Draw release info
		this.drawReleaseInfo(ctx, albumData.releaseDate, albumData.copyright || '', rightX, 3128);
	}

	private drawAlbumInfo(
		ctx: CanvasRenderingContext2D,
		title: string,
		artist: string,
		x: number,
		titleY: number,
		artistY: number,
	): void {
		ctx.fillStyle = this.config.textColor!;
		ctx.textAlign = 'right';
		ctx.textBaseline = 'top';

		// Title - bold
		ctx.font = 'bold 62px Ubuntu';
		ctx.fillText(title, x, titleY);

		// Artist - regular
		ctx.font = '62px Ubuntu';
		ctx.fillText(artist, x, artistY);
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
		copyright: string,
		x: number,
		startY: number,
	): void {
		ctx.fillStyle = this.config.textColor!;
		ctx.textAlign = 'right';
		ctx.textBaseline = 'top';

		// "Release Date" - bold
		ctx.font = 'bold 50px Ubuntu';
		ctx.fillText('Release Date', x, startY);

		// Release date - regular
		ctx.font = '50px Ubuntu';
		ctx.fillText(releaseDate, x, startY + 66);

		// "Released by" - bold
		ctx.font = 'bold 50px Ubuntu';
		ctx.fillText('Released by', x, startY + 149);

		// Copyright - regular
		ctx.font = '50px Ubuntu';
		ctx.fillText(copyright, x, startY + 215);
	}
}
