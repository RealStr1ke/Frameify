/**
 * Spotify Song Design - Modern song poster with Spotify-specific features
 */

import type { Canvas, CanvasRenderingContext2D } from 'canvas';
import { PosterDesign } from '../core/base';
import type { SongData, RenderContext } from '../types';
import { extractColorPalette } from '../utils/color-utils';
import { truncateText } from '../utils/canvas-utils';
import { getTransparentSpotifyCode } from '../integrations/providers/spotify';
import { designRegistry } from '../registry';
import * as canvas from 'canvas';
import { readFile } from 'node:fs/promises';

/**
 * Extended SongData interface for Spotify-specific features
 */
export interface SpotifySongData extends SongData {
	spotifyUri: string;
	trackNumber: number;
	totalTracks: number;
}

/**
 * Spotify Song Design - Modern song poster with Spotify branding and scannable code
 */
export class SpotifySongDesign extends PosterDesign<SpotifySongData> {
	private albumCoverSize: number;
	private borderRadius: number;
	private iconColor: string;
	private iconPath: string;
	private headphonesIconPath: string;
	private spotifyCodeColor: string;

	constructor(config: {
		width?: number;
		height?: number;
		margin?: number;
		textColor?: string;
		dividerColor?: string;
		albumCoverSize?: number;
		borderRadius?: number;
		iconColor?: string;
		iconPath?: string;
		headphonesIconPath?: string;
		spotifyCodeColor?: string;
	} = {}) {
		super(config);
		this.albumCoverSize = config.albumCoverSize ?? 2300;
		this.borderRadius = config.borderRadius ?? 50;
		this.iconColor = config.iconColor ?? '#ffffff';
		this.iconPath = config.iconPath ?? './assets/svgs/S1_PLAYBACK_CONTROLS.svg';
		this.headphonesIconPath = config.headphonesIconPath ?? './assets/svgs/SS_HEADPHONES.svg';
		this.spotifyCodeColor = config.spotifyCodeColor ?? '#1DB954'; // Spotify green
	}

	getName(): string {
		return 'Spotify Song Design';
	}

	getDescription(): string {
		return 'Modern song poster with Spotify branding and scannable code';
	}

	validateData(data: SpotifySongData): void {
		if (!data.coverImagePath) {
			throw new Error('Album cover image path is required');
		}
		if (!data.title) {
			throw new Error('Song title is required');
		}
		if (!data.artist) {
			throw new Error('Artist is required');
		}
		if (!data.spotifyUri) {
			throw new Error('Spotify URI is required');
		}
		if (!data.trackNumber) {
			throw new Error('Track number is required');
		}
		if (!data.totalTracks) {
			throw new Error('Total tracks is required');
		}
	}

	async prepareRenderContext(data: SpotifySongData, posterCanvas: Canvas, ctx: CanvasRenderingContext2D): Promise<RenderContext> {
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
		const songData = data as SpotifySongData;

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

		// Draw headphones icon at 200x3320 with dimensions 80x80
		await this.drawColoredSVG(ctx, this.headphonesIconPath, 200, 3320, 80, 80, this.iconColor);

		// Draw "Headphones" text at 290x3320, Ubuntu bold 70px
		ctx.fillStyle = this.config.textColor || '#ffffff';
		ctx.font = 'bold 70px Ubuntu';
		ctx.textAlign = 'left';
		ctx.textBaseline = 'top';
		ctx.fillText('Headphones', 290, 3320);

		// Draw track number at 2500x3320 (top right), Ubuntu bold 70px
		ctx.font = 'bold 70px Ubuntu';
		ctx.textAlign = 'right';
		ctx.textBaseline = 'top';
		const trackText = `Track ${songData.trackNumber} of ${songData.totalTracks}`;
		ctx.fillText(trackText, 2500, 3320);

		// Draw Spotify scannable code at 2500x2580 (top right) with dimensions 720x180
		await this.drawSpotifyCode(ctx, songData.spotifyUri, 2500 - 720, 2580, 720, 180, this.spotifyCodeColor);

		// Clean and prepare text
		const cleanedTitle = this.cleanTitle(songData.title);

		// Draw song title
		ctx.fillStyle = this.config.textColor || '#ffffff';
		ctx.font = 'bold 92px Ubuntu';
		ctx.textAlign = 'left';
		ctx.textBaseline = 'top';
		const truncatedTitle = truncateText(ctx, cleanedTitle, config.width - 400); // 200px margin on each side
		ctx.fillText(truncatedTitle, 200, 2560);

		// Draw artist name
		ctx.font = '78px Ubuntu';
		ctx.textAlign = 'left';
		const truncatedArtist = truncateText(ctx, songData.artist, config.width - 400);
		ctx.fillText(truncatedArtist, 200, 2670);

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
	}

	/**
	 * Draw Spotify scannable code with transparent background and colored border
	 */
	private async drawSpotifyCode(
		ctx: CanvasRenderingContext2D,
		spotifyUri: string,
		x: number,
		y: number,
		width: number,
		height: number,
		color: string,
	): Promise<void> {
		try {
			// Get transparent Spotify code SVG
			const transparentSvg = await getTransparentSpotifyCode(spotifyUri, 'white');
			
			// Modify the SVG to use the specified color
			let coloredSvg = transparentSvg.replace(/stroke="white"/g, `stroke="${color}"`);
			coloredSvg = coloredSvg.replace(/fill="white"/g, `fill="${color}"`);
			coloredSvg = coloredSvg.replace(/stroke="#ffffff"/g, `stroke="${color}"`);
			coloredSvg = coloredSvg.replace(/fill="#ffffff"/g, `fill="${color}"`);

			// Draw border with rounded corners
			this.drawRoundedRect(ctx, x - 10, y - 10, width + 20, height + 20, 50, 'transparent', color, 10);

			// Convert SVG to data URI and draw
			const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(coloredSvg).toString('base64')}`;
			const image = await canvas.loadImage(svgDataUri);
			ctx.drawImage(image, x, y, width, height);
		} catch (error) {
			console.warn(`Failed to load Spotify code for ${spotifyUri}:`, error);
		}
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
	 * Draw a rounded rectangle with optional stroke
	 */
	private drawRoundedRect(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		width: number,
		height: number,
		radius: number,
		fillColor: string,
		strokeColor?: string,
		strokeWidth?: number,
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

		if (fillColor !== 'transparent') {
			ctx.fillStyle = fillColor;
			ctx.fill();
		}

		if (strokeColor && strokeWidth) {
			ctx.strokeStyle = strokeColor;
			ctx.lineWidth = strokeWidth;
			ctx.stroke();
		}
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
			coloredSvg = coloredSvg.replace(/stroke="black"/g, `stroke="${color}"`);
			coloredSvg = coloredSvg.replace(/fill="black"/g, `fill="${color}"`);

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

// Self-register with the design registry
designRegistry.register(SpotifySongDesign, {
	name: 'spotify-song',
	displayName: 'Spotify Song Design',
	description: 'Spotify-branded song poster with scannable code and platform-specific features',
	category: 'song',
	platform: 'spotify',
	version: '1.0.0',
	author: 'Frameify',
	tags: ['spotify', 'scannable', 'modern', 'branded', 'headphones'],
	requiredDataFields: ['title', 'artist', 'coverImagePath', 'spotifyUri', 'trackNumber', 'totalTracks'],
	supportedFormats: ['png'],
});
