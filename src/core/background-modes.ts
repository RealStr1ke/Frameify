/**
 * Concrete implementations of background modes
 */

import * as canvas from 'canvas';
import type { CanvasRenderingContext2D } from 'canvas';
import { BackgroundMode } from './base';

/**
 * Solid black background
 */
export class BlackBackground extends BackgroundMode {
	render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
		ctx.fillStyle = '#000000';
		ctx.fillRect(0, 0, width, height);
	}

	getDescription(): string {
		return 'Solid black background';
	}
}

/**
 * Solid white background
 */
export class WhiteBackground extends BackgroundMode {
	render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, width, height);
	}

	getDescription(): string {
		return 'Solid white background';
	}
}

/**
 * Custom solid color background
 */
export class SolidColorBackground extends BackgroundMode {
	constructor(private color: string) {
		super();
	}

	render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
		ctx.fillStyle = this.color;
		ctx.fillRect(0, 0, width, height);
	}

	getDescription(): string {
		return `Solid color background: ${this.color}`;
	}
}

/**
 * Linear gradient from top to bottom
 */
export class GradientTopBackground extends BackgroundMode {
	constructor(private colors: string[]) {
		super();
		if (colors.length < 2) {
			throw new Error('Gradient requires at least 2 colors');
		}
	}

	render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
		const gradient = ctx.createLinearGradient(0, 0, 0, height);

		// Distribute colors evenly
		const step = 1 / (this.colors.length - 1);
		this.colors.forEach((color, index) => {
			gradient.addColorStop(index * step, color);
		});

		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);
	}

	getDescription(): string {
		return `Gradient from top to bottom: ${this.colors.join(' → ')}`;
	}
}

/**
 * Linear gradient from bottom to top
 */
export class GradientBottomBackground extends BackgroundMode {
	constructor(private colors: string[]) {
		super();
		if (colors.length < 2) {
			throw new Error('Gradient requires at least 2 colors');
		}
	}

	render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
		const gradient = ctx.createLinearGradient(0, height, 0, 0);

		// Distribute colors evenly
		const step = 1 / (this.colors.length - 1);
		this.colors.forEach((color, index) => {
			gradient.addColorStop(index * step, color);
		});

		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);
	}

	getDescription(): string {
		return `Gradient from bottom to top: ${this.colors.join(' → ')}`;
	}
}

/**
 * Custom gradient with defined color stops
 */
export class CustomGradientBackground extends BackgroundMode {
	constructor(
		private colorStops: { position: number; color: string }[],
		private direction: 'horizontal' | 'vertical' | 'diagonal' = 'vertical',
	) {
		super();
		if (colorStops.length < 2) {
			throw new Error('Gradient requires at least 2 color stops');
		}
	}

	render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
		let gradient;

		switch (this.direction) {
			case 'horizontal':
				gradient = ctx.createLinearGradient(0, 0, width, 0);
				break;
			case 'diagonal':
				gradient = ctx.createLinearGradient(0, 0, width, height);
				break;
			case 'vertical':
			default:
				gradient = ctx.createLinearGradient(0, 0, 0, height);
				break;
		}

		this.colorStops.forEach(({ position, color }) => {
			gradient.addColorStop(position, color);
		});

		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);
	}

	getDescription(): string {
		return `Custom ${this.direction} gradient with ${this.colorStops.length} stops`;
	}
}

/**
 * Radial gradient background
 */
export class RadialGradientBackground extends BackgroundMode {
	constructor(
		private colors: string[],
		private centerX: number = 0.5,
		private centerY: number = 0.5,
	) {
		super();
		if (colors.length < 2) {
			throw new Error('Gradient requires at least 2 colors');
		}
	}

	render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
		const x = width * this.centerX;
		const y = height * this.centerY;
		const radius = Math.max(width, height);

		const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

		// Distribute colors evenly
		const step = 1 / (this.colors.length - 1);
		this.colors.forEach((color, index) => {
			gradient.addColorStop(index * step, color);
		});

		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);
	}

	getDescription(): string {
		return `Radial gradient: ${this.colors.join(' → ')}`;
	}
}

/**
 * Image background (stretched or fitted)
 */
export class ImageBackground extends BackgroundMode {
	constructor(
		private imagePath: string,
		private mode: 'fill' | 'fit' | 'stretch' = 'fill',
	) {
		super();
	}

	async render(ctx: CanvasRenderingContext2D, width: number, height: number): Promise<void> {
		const image = await canvas.loadImage(this.imagePath);

		if (this.mode === 'stretch') {
			ctx.drawImage(image, 0, 0, width, height);
		} else if (this.mode === 'fit') {
			const scale = Math.min(width / image.width, height / image.height);
			const scaledWidth = image.width * scale;
			const scaledHeight = image.height * scale;
			const x = (width - scaledWidth) / 2;
			const y = (height - scaledHeight) / 2;
			ctx.drawImage(image, x, y, scaledWidth, scaledHeight);
		} else {
			// 'fill' - cover the entire canvas
			const scale = Math.max(width / image.width, height / image.height);
			const scaledWidth = image.width * scale;
			const scaledHeight = image.height * scale;
			const x = (width - scaledWidth) / 2;
			const y = (height - scaledHeight) / 2;
			ctx.drawImage(image, x, y, scaledWidth, scaledHeight);
		}
	}

	getDescription(): string {
		return `Image background (${this.mode}): ${this.imagePath}`;
	}
}

/**
 * Album cover color palette gradient (automatically extracted)
 */
export class AlbumColorPaletteBackground extends BackgroundMode {
	constructor(
		private extractedColors: string[],
		private style: 'smooth' | 'emphasized' = 'emphasized',
		private direction: 'lightToDark' | 'darkToLight' = 'lightToDark',
	) {
		super();
	}

	render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
		if (this.extractedColors.length === 0) {
			// Fallback to black
			ctx.fillStyle = '#000000';
			ctx.fillRect(0, 0, width, height);
			return;
		}

		// Reverse colors if direction is dark to light
		const colors = this.direction === 'darkToLight'
			? [...this.extractedColors].reverse()
			: this.extractedColors;

		const gradient = ctx.createLinearGradient(0, 0, 0, height);

		if (this.style === 'emphasized') {
			// Different stop points based on direction
			if (this.direction === 'lightToDark') {
				// Light to dark: emphasis on top and bottom
				gradient.addColorStop(0, colors[0]); // Lightest at top
				if (colors.length > 1) gradient.addColorStop(0.1, colors[1]);
				if (colors.length > 2) gradient.addColorStop(0.3, colors[2]);
				if (colors.length > 3) gradient.addColorStop(0.5, colors[3]);
				if (colors.length > 4) {
					gradient.addColorStop(1, colors[4]); // Darkest at bottom
				} else {
					gradient.addColorStop(1, colors[colors.length - 1]);
				}
			} else {
				// Dark to light: reversed stop points
				gradient.addColorStop(0, colors[0]); // Darkest at top
				if (colors.length > 1) gradient.addColorStop(0.5, colors[1]);
				if (colors.length > 2) gradient.addColorStop(0.7, colors[2]);
				if (colors.length > 3) gradient.addColorStop(0.9, colors[3]);
				if (colors.length > 4) {
					gradient.addColorStop(1, colors[4]); // Lightest at bottom
				} else {
					gradient.addColorStop(1, colors[colors.length - 1]);
				}
			}
		} else {
			// Smooth distribution
			const step = 1 / (colors.length - 1);
			colors.forEach((color, index) => {
				gradient.addColorStop(index * step, color);
			});
		}

		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);
	}

	getDescription(): string {
		return `Album color palette gradient (${this.style}, ${this.direction})`;
	}
}

/**
 * Custom background with user-provided render function
 */
export class CustomBackground extends BackgroundMode {
	constructor(
		private renderFn: (ctx: CanvasRenderingContext2D, width: number, height: number) => void | Promise<void>,
		private description: string = 'Custom background',
	) {
		super();
	}

	async render(ctx: CanvasRenderingContext2D, width: number, height: number): Promise<void> {
		await this.renderFn(ctx, width, height);
	}

	getDescription(): string {
		return this.description;
	}
}
