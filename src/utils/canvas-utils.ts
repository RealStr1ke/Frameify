/**
 * Canvas drawing utilities
 */

import type { CanvasRenderingContext2D } from 'canvas';
import * as canvas from 'canvas';

/**
 * Truncate text to fit within a specified width
 */
export function truncateText(
	ctx: CanvasRenderingContext2D,
	text: string,
	maxWidth: number,
): string {
	const metrics = ctx.measureText(text);
	if (metrics.width <= maxWidth) return text;

	let truncated = text;
	while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
		truncated = truncated.slice(0, -1);
	}
	return truncated + '...';
}

/**
 * Draw text with automatic line wrapping
 */
export function drawWrappedText(
	ctx: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	maxWidth: number,
	lineHeight: number,
): number {
	const words = text.split(' ');
	let line = '';
	let currentY = y;

	for (let n = 0; n < words.length; n++) {
		const testLine = line + words[n] + ' ';
		const metrics = ctx.measureText(testLine);
		const testWidth = metrics.width;

		if (testWidth > maxWidth && n > 0) {
			ctx.fillText(line, x, currentY);
			line = words[n] + ' ';
			currentY += lineHeight;
		} else {
			line = testLine;
		}
	}
	ctx.fillText(line, x, currentY);
	return currentY + lineHeight;
}

/**
 * Draw an image with drop shadow
 */
export async function drawImageWithShadow(
	ctx: CanvasRenderingContext2D,
	imagePath: string,
	x: number,
	y: number,
	width: number,
	height: number,
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

	ctx.drawImage(image, x, y, width, height);

	// Reset shadow
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;
	ctx.shadowBlur = 0;
	ctx.shadowColor = 'transparent';
}

/**
 * Draw a line
 */
export function drawLine(
	ctx: CanvasRenderingContext2D,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	color: string = '#ffffff',
	width: number = 1,
): void {
	ctx.strokeStyle = color;
	ctx.lineWidth = width;
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
}

/**
 * Draw a rectangle with optional border
 */
export function drawRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	fillColor?: string,
	strokeColor?: string,
	strokeWidth: number = 1,
): void {
	if (fillColor) {
		ctx.fillStyle = fillColor;
		ctx.fillRect(x, y, width, height);
	}

	if (strokeColor) {
		ctx.strokeStyle = strokeColor;
		ctx.lineWidth = strokeWidth;
		ctx.strokeRect(x, y, width, height);
	}
}

/**
 * Draw a rounded rectangle
 */
export function drawRoundedRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
	fillColor?: string,
	strokeColor?: string,
	strokeWidth: number = 1,
): void {
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

	if (fillColor) {
		ctx.fillStyle = fillColor;
		ctx.fill();
	}

	if (strokeColor) {
		ctx.strokeStyle = strokeColor;
		ctx.lineWidth = strokeWidth;
		ctx.stroke();
	}
}
