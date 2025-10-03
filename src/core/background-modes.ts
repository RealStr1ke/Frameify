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
 * Blurred album cover background
 * Takes the album cover and applies a blur effect for an aesthetic background
 */
export class BlurredAlbumCoverBackground extends BackgroundMode {
	constructor(
		private albumCoverPath: string,
		private blurAmount: number = 20,
		private brightness: number = 0.7,
		private mode: 'fill' | 'fit' = 'fill',
	) {
		super();
	}

	async render(ctx: CanvasRenderingContext2D, width: number, height: number): Promise<void> {
		const image = await canvas.loadImage(this.albumCoverPath);

		// Create an offscreen canvas for the blur effect
		const offscreenCanvas = canvas.createCanvas(width, height);
		const offscreenCtx = offscreenCanvas.getContext('2d');

		// Draw the image with the selected mode
		if (this.mode === 'fit') {
			const scale = Math.min(width / image.width, height / image.height);
			const scaledWidth = image.width * scale;
			const scaledHeight = image.height * scale;
			const x = (width - scaledWidth) / 2;
			const y = (height - scaledHeight) / 2;

			// Fill background with black first
			offscreenCtx.fillStyle = '#000000';
			offscreenCtx.fillRect(0, 0, width, height);

			offscreenCtx.drawImage(image, x, y, scaledWidth, scaledHeight);
		} else {
			// 'fill' - cover the entire canvas
			const scale = Math.max(width / image.width, height / image.height);
			const scaledWidth = image.width * scale;
			const scaledHeight = image.height * scale;
			const x = (width - scaledWidth) / 2;
			const y = (height - scaledHeight) / 2;
			offscreenCtx.drawImage(image, x, y, scaledWidth, scaledHeight);
		}

		// Apply blur using multiple passes of box blur (approximates gaussian blur)
		const imageData = offscreenCtx.getImageData(0, 0, width, height);
		const blurredData = this.applyBlur(imageData, this.blurAmount);

		// Apply brightness adjustment
		if (this.brightness !== 1) {
			for (let i = 0; i < blurredData.data.length; i += 4) {
				blurredData.data[i] *= this.brightness; // R
				blurredData.data[i + 1] *= this.brightness; // G
				blurredData.data[i + 2] *= this.brightness; // B
			}
		}

		// Draw the blurred result to the main canvas
		ctx.putImageData(blurredData, 0, 0);
	}

	/**
	 * Apply Gaussian-like blur to image data using triple box blur
	 * This method approximates a true Gaussian blur very closely
	 */
	private applyBlur(imageData: canvas.ImageData, radius: number): canvas.ImageData {
		const { width, height, data } = imageData;

		// Calculate ideal box blur radii for approximating Gaussian blur
		// Using the formula: n = 3 (three passes)
		// wIdeal = sqrt((12*sigma^2/n)+1)
		// where sigma ≈ radius
		const boxes = this.boxesForGaussian(radius, 3);

		// Create working buffers
		let source = new Uint8ClampedArray(data);
		let target = new Uint8ClampedArray(data.length);

		// Apply three box blur passes
		for (let i = 0; i < 3; i++) {
			const r = boxes[i];
			this.boxBlur(source, target, width, height, r);
			// Swap buffers for next iteration
			[source, target] = [target, source];
		}

		// Create output ImageData with the final result
		const output = new canvas.ImageData(width, height);
		output.data.set(source);

		return output;
	}

	/**
	 * Calculate optimal box blur radii for approximating Gaussian blur
	 */
	private boxesForGaussian(sigma: number, n: number): number[] {
		const wIdeal = Math.sqrt((12 * sigma * sigma / n) + 1);
		let wl = Math.floor(wIdeal);
		if (wl % 2 === 0) wl--;
		const wu = wl + 2;

		const mIdeal = (12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4);
		const m = Math.round(mIdeal);

		const sizes: number[] = [];
		for (let i = 0; i < n; i++) {
			sizes.push(i < m ? wl : wu);
		}
		return sizes.map(s => (s - 1) / 2);
	}

	/**
	 * Single box blur pass (horizontal + vertical)
	 */
	private boxBlur(
		source: Uint8ClampedArray,
		target: Uint8ClampedArray,
		width: number,
		height: number,
		radius: number,
	): void {
		// Horizontal pass
		const temp = new Uint8ClampedArray(source.length);
		this.boxBlurHorizontal(source, temp, width, height, radius);

		// Vertical pass
		this.boxBlurVertical(temp, target, width, height, radius);
	}

	/**
	 * Horizontal box blur pass (optimized with sliding window)
	 */
	private boxBlurHorizontal(
		input: Uint8ClampedArray,
		output: Uint8ClampedArray,
		width: number,
		height: number,
		radius: number,
	): void {
		const iarr = 1 / (radius + radius + 1);

		for (let y = 0; y < height; y++) {
			let ti = y * width;
			let li = ti;
			let ri = ti + radius;

			const fv = input[ti * 4];
			const fv1 = input[ti * 4 + 1];
			const fv2 = input[ti * 4 + 2];
			const fv3 = input[ti * 4 + 3];

			const lv = input[(ti + width - 1) * 4];
			const lv1 = input[(ti + width - 1) * 4 + 1];
			const lv2 = input[(ti + width - 1) * 4 + 2];
			const lv3 = input[(ti + width - 1) * 4 + 3];

			let val_r = (radius + 1) * fv;
			let val_g = (radius + 1) * fv1;
			let val_b = (radius + 1) * fv2;
			let val_a = (radius + 1) * fv3;

			for (let j = 0; j < radius; j++) {
				const idx = (ti + j) * 4;
				val_r += input[idx];
				val_g += input[idx + 1];
				val_b += input[idx + 2];
				val_a += input[idx + 3];
			}

			for (let j = 0; j <= radius; j++) {
				const idx = ri * 4;
				val_r += input[idx] - fv;
				val_g += input[idx + 1] - fv1;
				val_b += input[idx + 2] - fv2;
				val_a += input[idx + 3] - fv3;

				const outIdx = ti * 4;
				output[outIdx] = val_r * iarr;
				output[outIdx + 1] = val_g * iarr;
				output[outIdx + 2] = val_b * iarr;
				output[outIdx + 3] = val_a * iarr;

				ri++;
				ti++;
			}

			for (let j = radius + 1; j < width - radius; j++) {
				const riIdx = ri * 4;
				const liIdx = li * 4;

				val_r += input[riIdx] - input[liIdx];
				val_g += input[riIdx + 1] - input[liIdx + 1];
				val_b += input[riIdx + 2] - input[liIdx + 2];
				val_a += input[riIdx + 3] - input[liIdx + 3];

				const outIdx = ti * 4;
				output[outIdx] = val_r * iarr;
				output[outIdx + 1] = val_g * iarr;
				output[outIdx + 2] = val_b * iarr;
				output[outIdx + 3] = val_a * iarr;

				ri++;
				li++;
				ti++;
			}

			for (let j = width - radius; j < width; j++) {
				const liIdx = li * 4;

				val_r += lv - input[liIdx];
				val_g += lv1 - input[liIdx + 1];
				val_b += lv2 - input[liIdx + 2];
				val_a += lv3 - input[liIdx + 3];

				const outIdx = ti * 4;
				output[outIdx] = val_r * iarr;
				output[outIdx + 1] = val_g * iarr;
				output[outIdx + 2] = val_b * iarr;
				output[outIdx + 3] = val_a * iarr;

				li++;
				ti++;
			}
		}
	}

	/**
	 * Vertical box blur pass (optimized with sliding window)
	 */
	private boxBlurVertical(
		input: Uint8ClampedArray,
		output: Uint8ClampedArray,
		width: number,
		height: number,
		radius: number,
	): void {
		const iarr = 1 / (radius + radius + 1);

		for (let x = 0; x < width; x++) {
			let ti = x;
			let li = ti;
			let ri = ti + radius * width;

			const fv = input[ti * 4];
			const fv1 = input[ti * 4 + 1];
			const fv2 = input[ti * 4 + 2];
			const fv3 = input[ti * 4 + 3];

			const lv = input[(ti + width * (height - 1)) * 4];
			const lv1 = input[(ti + width * (height - 1)) * 4 + 1];
			const lv2 = input[(ti + width * (height - 1)) * 4 + 2];
			const lv3 = input[(ti + width * (height - 1)) * 4 + 3];

			let val_r = (radius + 1) * fv;
			let val_g = (radius + 1) * fv1;
			let val_b = (radius + 1) * fv2;
			let val_a = (radius + 1) * fv3;

			for (let j = 0; j < radius; j++) {
				const idx = (ti + j * width) * 4;
				val_r += input[idx];
				val_g += input[idx + 1];
				val_b += input[idx + 2];
				val_a += input[idx + 3];
			}

			for (let j = 0; j <= radius; j++) {
				const idx = ri * 4;
				val_r += input[idx] - fv;
				val_g += input[idx + 1] - fv1;
				val_b += input[idx + 2] - fv2;
				val_a += input[idx + 3] - fv3;

				const outIdx = ti * 4;
				output[outIdx] = val_r * iarr;
				output[outIdx + 1] = val_g * iarr;
				output[outIdx + 2] = val_b * iarr;
				output[outIdx + 3] = val_a * iarr;

				ri += width;
				ti += width;
			}

			for (let j = radius + 1; j < height - radius; j++) {
				const riIdx = ri * 4;
				const liIdx = li * 4;

				val_r += input[riIdx] - input[liIdx];
				val_g += input[riIdx + 1] - input[liIdx + 1];
				val_b += input[riIdx + 2] - input[liIdx + 2];
				val_a += input[riIdx + 3] - input[liIdx + 3];

				const outIdx = ti * 4;
				output[outIdx] = val_r * iarr;
				output[outIdx + 1] = val_g * iarr;
				output[outIdx + 2] = val_b * iarr;
				output[outIdx + 3] = val_a * iarr;

				ri += width;
				li += width;
				ti += width;
			}

			for (let j = height - radius; j < height; j++) {
				const liIdx = li * 4;

				val_r += lv - input[liIdx];
				val_g += lv1 - input[liIdx + 1];
				val_b += lv2 - input[liIdx + 2];
				val_a += lv3 - input[liIdx + 3];

				const outIdx = ti * 4;
				output[outIdx] = val_r * iarr;
				output[outIdx + 1] = val_g * iarr;
				output[outIdx + 2] = val_b * iarr;
				output[outIdx + 3] = val_a * iarr;

				li += width;
				ti += width;
			}
		}
	}

	getDescription(): string {
		return `Blurred album cover (Gaussian-like blur: ${this.blurAmount}px, brightness: ${this.brightness * 100}%)`;
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

		// First, fill with dark base color (#1e1e1e)
		ctx.fillStyle = '#1e1e1e';
		ctx.fillRect(0, 0, width, height);

		// Reverse colors if direction is dark to light
		const colors = this.direction === 'darkToLight'
			? [...this.extractedColors].reverse()
			: this.extractedColors;

		// Create gradient with opacity - the gradient will be semi-transparent on the dark end
		const gradient = ctx.createLinearGradient(0, 0, 0, height);

		if (this.style === 'emphasized') {
			// Different stop points based on direction
			if (this.direction === 'lightToDark') {
				// Light to dark: emphasis on top and bottom
				// Top (light) - full opacity
				gradient.addColorStop(0, colors[0]); // Lightest at top, full opacity
				if (colors.length > 1) gradient.addColorStop(0.2, colors[1]);
				if (colors.length > 2) gradient.addColorStop(0.4, colors[2]);
				if (colors.length > 3) {
					const rgb3 = this.hexToRgb(colors[3]);
					gradient.addColorStop(0.6, `rgba(${rgb3.r}, ${rgb3.g}, ${rgb3.b}, 0.8)`);
				}
				if (colors.length > 4) {
					// Bottom (dark) - 50% opacity to let base #1e1e1e color show through
					const rgb4 = this.hexToRgb(colors[4]);
					gradient.addColorStop(0.8, `rgba(${rgb4.r}, ${rgb4.g}, ${rgb4.b}, 0.6)`);
					gradient.addColorStop(1, `rgba(${rgb4.r}, ${rgb4.g}, ${rgb4.b}, 0.5)`);
				} else {
					const lastColor = colors[colors.length - 1];
					const rgb = this.hexToRgb(lastColor);
					gradient.addColorStop(0.8, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
					gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`);
				}
			} else {
				// Dark to light: reversed stop points
				// Top (dark) - 50% opacity to show base layer
				const rgb0 = this.hexToRgb(colors[0]);
				gradient.addColorStop(0, `rgba(${rgb0.r}, ${rgb0.g}, ${rgb0.b}, 0.5)`);
				gradient.addColorStop(0.2, `rgba(${rgb0.r}, ${rgb0.g}, ${rgb0.b}, 0.6)`);
				if (colors.length > 1) {
					const rgb1 = this.hexToRgb(colors[1]);
					gradient.addColorStop(0.4, `rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, 0.8)`);
				}
				if (colors.length > 2) gradient.addColorStop(0.6, colors[2]);
				if (colors.length > 3) gradient.addColorStop(0.8, colors[3]);
				if (colors.length > 4) {
					// Bottom (light) - full opacity
					gradient.addColorStop(1, colors[4]);
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

	private hexToRgb(hex: string): { r: number; g: number; b: number } {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16),
		} : { r: 0, g: 0, b: 0 };
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
