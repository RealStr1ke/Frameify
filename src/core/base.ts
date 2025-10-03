/**
 * Abstract base classes for the poster generator system
 */

import type { Canvas, CanvasRenderingContext2D } from 'canvas';
import type { RenderContext, PosterConfig } from '../types';

/**
 * Abstract base class for background rendering modes
 */
export abstract class BackgroundMode {
	/**
	 * Render the background on the canvas
	 */
	abstract render(ctx: CanvasRenderingContext2D, width: number, height: number): Promise<void> | void;

	/**
	 * Get a description of this mode
	 */
	abstract getDescription(): string;
}

/**
 * Abstract base class for poster designs
 */
export abstract class PosterDesign<TData = any> {
	protected config: PosterConfig;

	constructor(config: Partial<PosterConfig> = {}) {
		this.config = {
			width: config.width ?? 2700,
			height: config.height ?? 3600,
			margin: config.margin ?? 200,
			textColor: config.textColor ?? '#ffffff',
			dividerColor: config.dividerColor ?? '#ffffff',
		};
	}

	/**
	 * Get the poster configuration
	 */
	getConfig(): PosterConfig {
		return { ...this.config };
	}

	/**
	 * Update poster configuration
	 */
	setConfig(config: Partial<PosterConfig>): this {
		this.config = { ...this.config, ...config };
		return this;
	}

	/**
	 * Validate the data before rendering
	 */
	abstract validateData(data: TData): void;

	/**
	 * Prepare any additional data needed for rendering (e.g., extract colors)
	 */
	abstract prepareRenderContext(data: TData, canvas: Canvas, ctx: CanvasRenderingContext2D): Promise<RenderContext>;

	/**
	 * Render the poster design (excluding background)
	 */
	abstract renderContent(context: RenderContext): Promise<void>;

	/**
	 * Get the name of this design
	 */
	abstract getName(): string;

	/**
	 * Get a description of this design
	 */
	abstract getDescription(): string;
}
