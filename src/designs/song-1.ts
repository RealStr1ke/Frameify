/**
 * Song Design #1 - Modern song poster with rounded album cover
 */

import type { Canvas, CanvasRenderingContext2D } from 'canvas';
import { PosterDesign } from '../core/base';
import type { SongData, RenderContext } from '../types';
import { extractColorPalette } from '../utils/color-utils';
import { truncateText } from '../utils/canvas-utils';
import * as canvas from 'canvas';
import { readFile } from 'node:fs/promises';

/**
 * Song Design #1 - Modern song poster design
 */
export class Song1Design extends PosterDesign<SongData> {
	private albumCoverSize: number;
	private borderRadius: number;
	private iconColor: string;
	private iconPath: string;

	constructor(config: { width?: number; height?: number; margin?: number; textColor?: string; dividerColor?: string; albumCoverSize?: number; borderRadius?: number; iconColor?: string; iconPath?: string } = {}) {
		super(config);
		this.albumCoverSize = config.albumCoverSize ?? 2300;
		this.borderRadius = config.borderRadius ?? 50;
		this.iconColor = config.iconColor ?? '#ffffff';
		this.iconPath = config.iconPath ?? './assets/svgs/song-1-icons.svg';
	}

	getName(): string {
		return 'Song Design #1';
	}

	getDescription(): string {
		return 'Modern song poster with rounded album cover';
	}

	validateData(data: SongData): void {
		if (!data.coverImagePath) {
			throw new Error('Album cover image path is required');
		}
		if (!data.title) {
			throw new Error('Song title is required');
		}
		if (!data.artist) {
			throw new Error('Artist is required');
		}
	}

	async prepareRenderContext(data: SongData, posterCanvas: Canvas, ctx: CanvasRenderingContext2D): Promise<RenderContext> {
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
		const { ctx, config, data } = context;
		const songData = data as SongData;

		// Draw album cover with rounded corners and shadow
		await this.drawRoundedImageWithShadow(
			ctx,
			songData.coverImagePath,
			config.margin,
			config.margin,
			this.albumCoverSize,
			this.albumCoverSize,
			this.borderRadius,
			{
				offsetX: 0,
				offsetY: 4,
				blur: 100,
				color: 'rgba(0, 0, 0, 0.75)',
			},
		);

		// Clean and prepare text
		const cleanedTitle = this.cleanTitle(songData.title);

		// Draw song title
		ctx.fillStyle = this.config.textColor || '#ffffff';
		ctx.font = 'bold 92px Ubuntu';
		ctx.textAlign = 'left';
		ctx.textBaseline = 'top';
		const truncatedTitle = truncateText(ctx, cleanedTitle, config.width - 400); // 200px margin on each side
		ctx.fillText(truncatedTitle, 200, 2560);

		// Calculate available width for artist name
		// If there's a track number, we need to leave space for it
		let artistMaxWidth = config.width - 400; // Default: 200px margin on each side
		if (songData.trackNumber) {
			// Measure track number text to know how much space it takes
			ctx.font = 'bold 78px Ubuntu';
			ctx.textAlign = 'right';
			const trackText = songData.totalTracks
				? `Track ${songData.trackNumber} of ${songData.totalTracks}`
				: `Track ${songData.trackNumber}`;
			const trackWidth = ctx.measureText(trackText).width;
			// Artist max width = total width - left margin - track width - gap - right margin
			artistMaxWidth = config.width - 200 - trackWidth - 100 - 200; // 100px gap between artist and track number
		}

		// Draw artist name with dynamic truncation
		ctx.font = '78px Ubuntu';
		ctx.textAlign = 'left';
		const truncatedArtist = truncateText(ctx, songData.artist, artistMaxWidth);
		ctx.fillText(truncatedArtist, 200, 2670);

		// Draw track number (if available)
		if (songData.trackNumber) {
			ctx.font = 'bold 78px Ubuntu';
			ctx.textAlign = 'right';
			ctx.textBaseline = 'top';
			const trackText = songData.totalTracks
				? `Track ${songData.trackNumber} of ${songData.totalTracks}`
				: `Track ${songData.trackNumber}`;
			ctx.fillText(trackText, 2500, 2670);
		}

		// Draw progress bar background (rounded rectangle)
		this.drawRoundedRect(ctx, 200, 2820, 2300, 50, 50, '#b3b3b3');

		// Draw progress indicator
		// Calculate progress width based on song progress (0-1)
		const progress = songData.progress ?? 0;
		const progressWidth = Math.round(progress * 2290); // Max width: 2290
		if (progressWidth > 0) {
			this.drawRoundedRect(ctx, 205, 2825, progressWidth, 40, 50, '#1e1e1e');
		}

		// Draw time labels
		const currentTime = Math.round(songData.duration * progress);
		const remainingTime = songData.duration - currentTime;

		// Format time as M:SS
		const formatTime = (seconds: number) => {
			const mins = Math.floor(seconds / 60);
			const secs = seconds % 60;
			return `${mins}:${secs.toString().padStart(2, '0')}`;
		};

		ctx.font = 'bold 78px Ubuntu';
		ctx.fillStyle = this.config.textColor || '#ffffff';
		ctx.textBaseline = 'top';

		// Current time (left-aligned)
		ctx.textAlign = 'left';
		ctx.fillText(formatTime(currentTime), 200, 2885);

		// Remaining time (right-aligned, with negative sign)
		ctx.textAlign = 'right';
		ctx.fillText(`-${formatTime(remainingTime)}`, 2500, 2885);

		// Draw icons SVG
		await this.drawColoredSVG(ctx, this.iconPath, 400, 2950, 1900, 300, this.iconColor);

		// Draw copyright/label and release date
		ctx.font = '50px Ubuntu';
		ctx.fillStyle = this.config.textColor || '#ffffff';
		ctx.textBaseline = 'top';

		// Copyright/Label (left-aligned)
		ctx.textAlign = 'left';
		const copyrightText = this.formatCopyrightLabel(songData);
		ctx.fillText(copyrightText, 200, 3343);

		// Release date (right-aligned)
		ctx.textAlign = 'right';
		if (songData.releaseDate) {
			const formattedDate = this.formatReleaseDate(songData.releaseDate);
			ctx.fillText(formattedDate, 2500, 3343);
		}
	}

	/**
	 * Format release date from YYYY-MM-DD to "Month Day, Year"
	 */
	private formatReleaseDate(dateString: string): string {
		const [year, month, day] = dateString.split('-').map(Number);

		const months = [
			'January', 'February', 'March', 'April', 'May', 'June',
			'July', 'August', 'September', 'October', 'November', 'December',
		];

		const monthName = months[month - 1] || '';
		return `${monthName} ${day}, ${year}`;
	}

	/**
	 * Format copyright and label information
	 */
	private formatCopyrightLabel(data: SongData): string {
		const year = data.releaseDate ? new Date(data.releaseDate).getFullYear() : '';
		const label = data.label || data.artist || ''; // Use artist as fallback

		if (year && label) {
			return `© ${year} ${label}`;
		} else if (year) {
			return `© ${year}`;
		} else if (label) {
			return label;
		}
		return '';
	}

	/**
	 * Clean song title by removing featuring credits
	 */
	private cleanTitle(title: string): string {
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

	/**
	 * Draw a rounded rectangle
	 */
	private drawRoundedRect(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		width: number,
		height: number,
		radius: number,
		fillColor: string,
	): void {
		// Clamp radius to half of the smallest dimension
		const r = Math.min(radius, width / 2, height / 2);

		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.lineTo(x + width - r, y);
		ctx.arc(x + width - r, y + r, r, -Math.PI / 2, 0);
		ctx.lineTo(x + width, y + height - r);
		ctx.arc(x + width - r, y + height - r, r, 0, Math.PI / 2);
		ctx.lineTo(x + r, y + height);
		ctx.arc(x + r, y + height - r, r, Math.PI / 2, Math.PI);
		ctx.lineTo(x, y + r);
		ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
		ctx.closePath();
		ctx.fillStyle = fillColor;
		ctx.fill();
	}

	/**
	 * Draw an image with rounded corners and drop shadow
	 */
	private async drawRoundedImageWithShadow(
		ctx: CanvasRenderingContext2D,
		imagePath: string,
		x: number,
		y: number,
		width: number,
		height: number,
		radius: number,
		shadowConfig: {
			offsetX?: number;
			offsetY?: number;
			blur?: number;
			color?: string;
		} = {},
	): Promise<void> {
		const image = await canvas.loadImage(imagePath);

		// Apply shadow
		ctx.shadowOffsetX = shadowConfig.offsetX ?? 0;
		ctx.shadowOffsetY = shadowConfig.offsetY ?? 4;
		ctx.shadowBlur = shadowConfig.blur ?? 100;
		ctx.shadowColor = shadowConfig.color ?? 'rgba(0, 0, 0, 0.75)';

		// Create rounded rectangle clipping path
		ctx.beginPath();
		ctx.moveTo(x + radius, y);
		ctx.lineTo(x + width - radius, y);
		ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
		ctx.lineTo(x + width, y + height - radius);
		ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
		ctx.lineTo(x + radius, y + height);
		ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
		ctx.lineTo(x, y + radius);
		ctx.quadraticCurveTo(x, y, x + radius, y);
		ctx.closePath();

		// Fill with shadow first (this creates the shadow effect)
		ctx.fill();

		// Reset shadow for the actual image
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;
		ctx.shadowBlur = 0;
		ctx.shadowColor = 'transparent';

		// Clip to rounded rectangle and draw image
		ctx.save();
		ctx.clip();
		ctx.drawImage(image, x, y, width, height);
		ctx.restore();
	}

	/**
	 * Draw an SVG with a custom color
	 */
	private async drawColoredSVG(
		ctx: CanvasRenderingContext2D,
		svgPath: string,
		x: number,
		y: number,
		width: number,
		height: number,
		color: string,
	): Promise<void> {
		try {
			// Read SVG file
			const svgContent = await readFile(svgPath, 'utf-8');

			// Replace stroke and fill colors with the desired color
			let coloredSvg = svgContent.replace(/stroke="white"/g, `stroke="${color}"`);
			coloredSvg = coloredSvg.replace(/fill="white"/g, `fill="${color}"`);

			// Convert SVG to data URI
			const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(coloredSvg).toString('base64')}`;

			// Load and draw the image
			const image = await canvas.loadImage(svgDataUri);
			ctx.drawImage(image, x, y, width, height);
		} catch (error) {
			console.warn(`Failed to load SVG from ${svgPath}:`, error);
		}
	}
}
