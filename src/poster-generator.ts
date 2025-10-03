/**
 * Main PosterGenerator class - orchestrates design and background rendering
 */

import * as canvas from 'canvas';
import * as fs from 'node:fs';
import type { PosterDesign, BackgroundMode } from './core/base';
import { AlbumColorPaletteBackground } from './core/background-modes';

/**
 * Options for automatic background generation
 */
export interface AutoBackgroundOptions {
	direction?: 'lightToDark' | 'darkToLight';
	style?: 'smooth' | 'emphasized';
}

/**
 * Main poster generator class with fluent API
 */
export class PosterGenerator<TData = any> {
	private design: PosterDesign<TData> | null = null;
	private backgroundMode: BackgroundMode | null = null;
	private useAutoBackground: boolean = false;
	private autoBackgroundOptions: AutoBackgroundOptions = {};

	/**
	 * Set the poster design
	 */
	withDesign(design: PosterDesign<TData>): this {
		this.design = design;
		return this;
	}

	/**
	 * Set the background mode
	 */
	withBackground(mode: BackgroundMode): this {
		this.backgroundMode = mode;
		this.useAutoBackground = false;
		return this;
	}

	/**
	 * Use automatic background based on extracted colors (if design supports it)
	 * @param options Options for auto background (direction: 'lightToDark' or 'darkToLight', style: 'smooth' or 'emphasized')
	 */
	withAutoBackground(options: AutoBackgroundOptions = {}): this {
		this.useAutoBackground = true;
		this.backgroundMode = null;
		this.autoBackgroundOptions = {
			direction: options.direction ?? 'lightToDark',
			style: options.style ?? 'emphasized',
		};
		return this;
	}

	/**
	 * Generate the poster and save to file
	 */
	async generate(data: TData, outputPath: string): Promise<void> {
		if (!this.design) {
			throw new Error('Design is required. Use withDesign() to set a design.');
		}

		const config = this.design.getConfig();

		console.log(`Generating ${this.design.getName()}...`);
		console.log(`Canvas size: ${config.width}x${config.height}`);

		// Create canvas
		const posterCanvas = canvas.createCanvas(config.width, config.height);
		const ctx = posterCanvas.getContext('2d');

		// Prepare render context (validates data and extracts any needed info)
		const renderContext = await this.design.prepareRenderContext(data, posterCanvas, ctx);

		// Determine background mode
		let background = this.backgroundMode;

		if (this.useAutoBackground) {
			if (renderContext.extractedColors && renderContext.extractedColors.length > 0) {
				background = new AlbumColorPaletteBackground(
					renderContext.extractedColors,
					this.autoBackgroundOptions.style ?? 'emphasized',
					this.autoBackgroundOptions.direction ?? 'lightToDark',
				);
				console.log(`Using automatic background with extracted colors (${this.autoBackgroundOptions.direction})`);
			} else {
				console.warn('No extracted colors available, falling back to black background');
				const { BlackBackground } = await import('./core/background-modes');
				background = new BlackBackground();
			}
		}

		if (!background) {
			console.warn('No background mode specified, using black background');
			const { BlackBackground } = await import('./core/background-modes');
			background = new BlackBackground();
		}

		// Render background
		console.log(`Rendering background: ${background.getDescription()}`);
		await background.render(ctx, config.width, config.height);

		// Render design content
		console.log('Rendering poster content...');
		await this.design.renderContent(renderContext);

		// Save to file
		console.log(`Saving poster to ${outputPath}...`);
		const buffer = posterCanvas.toBuffer('image/png');
		fs.writeFileSync(outputPath, buffer);
		console.log('✓ Poster saved successfully!');
	}

	/**
	 * Generate poster and return as buffer instead of saving to file
	 */
	async generateBuffer(data: TData): Promise<Buffer> {
		if (!this.design) {
			throw new Error('Design is required. Use withDesign() to set a design.');
		}

		const config = this.design.getConfig();

		// Create canvas
		const posterCanvas = canvas.createCanvas(config.width, config.height);
		const ctx = posterCanvas.getContext('2d');

		// Prepare render context
		const renderContext = await this.design.prepareRenderContext(data, posterCanvas, ctx);

		// Determine background mode
		let background = this.backgroundMode;

		if (this.useAutoBackground && renderContext.extractedColors && renderContext.extractedColors.length > 0) {
			background = new AlbumColorPaletteBackground(
				renderContext.extractedColors,
				this.autoBackgroundOptions.style ?? 'emphasized',
				this.autoBackgroundOptions.direction ?? 'lightToDark',
			);
		}

		if (!background) {
			const { BlackBackground } = await import('./core/background-modes');
			background = new BlackBackground();
		}

		// Render background
		await background.render(ctx, config.width, config.height);

		// Render design content
		await this.design.renderContent(renderContext);

		// Return buffer
		return posterCanvas.toBuffer('image/png');
	}

	/**
	 * Create a new poster generator instance
	 */
	static create<T = any>(): PosterGenerator<T> {
		return new PosterGenerator<T>();
	}
}
