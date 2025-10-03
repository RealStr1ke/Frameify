/**
 * Color extraction and manipulation utilities
 */

import * as canvas from 'canvas';
import type { RGB } from '../types';

/**
 * Extract dominant colors from an image and sort them from light to dark
 */
export async function extractColorPalette(imagePath: string, numColors: number = 5): Promise<string[]> {
	const image = await canvas.loadImage(imagePath);
	const tempCanvas = canvas.createCanvas(image.width, image.height);
	const ctx = tempCanvas.getContext('2d');
	ctx.drawImage(image, 0, 0);

	const imageData = ctx.getImageData(0, 0, image.width, image.height);
	const pixels = imageData.data;

	// Sample pixels (every 10th pixel to speed up processing)
	const colorCounts = new Map<string, number>();
	for (let i = 0; i < pixels.length; i += 40) { // RGBA = 4 bytes, skip 10 pixels
		const r = pixels[i];
		const g = pixels[i + 1];
		const b = pixels[i + 2];
		const a = pixels[i + 3];

		// Skip transparent or very dark/bright pixels
		if (a < 128 || (r < 20 && g < 20 && b < 20) || (r > 235 && g > 235 && b > 235)) {
			continue;
		}

		// Quantize colors to reduce similar shades
		const qR = Math.round(r / 32) * 32;
		const qG = Math.round(g / 32) * 32;
		const qB = Math.round(b / 32) * 32;
		const colorKey = `${qR},${qG},${qB}`;

		colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
	}

	// Get most common colors
	const sortedColors = Array.from(colorCounts.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, numColors * 3) // Get more than needed for better selection
		.map(([color]) => {
			const [r, g, b] = color.split(',').map(Number);
			return { r, g, b };
		});

	// Calculate lightness and sort from light to dark
	const colorsWithLightness = sortedColors.map(color => {
		const lightness = (color.r + color.g + color.b) / 3;
		return { ...color, lightness };
	});

	// Filter to get diverse colors (avoid very similar colors)
	const diverseColors: typeof colorsWithLightness = [];
	for (const color of colorsWithLightness) {
		if (diverseColors.length === 0) {
			diverseColors.push(color);
			continue;
		}

		// Check if this color is sufficiently different from already selected colors
		const isDifferent = diverseColors.every(existing => {
			const diff = Math.abs(color.lightness - existing.lightness);
			return diff > 20; // Minimum lightness difference
		});

		if (isDifferent) {
			diverseColors.push(color);
		}

		if (diverseColors.length >= numColors) break;
	}

	// If we don't have enough diverse colors, add the most common ones regardless of similarity
	if (diverseColors.length < numColors) {
		for (const color of colorsWithLightness) {
			if (!diverseColors.some(dc => dc.r === color.r && dc.g === color.g && dc.b === color.b)) {
				diverseColors.push(color);
				if (diverseColors.length >= numColors) break;
			}
		}
	}

	// Sort from light to dark
	diverseColors.sort((a, b) => b.lightness - a.lightness);

	// Convert to hex
	return diverseColors.map(color => {
		const r = Math.min(255, Math.max(0, color.r)).toString(16).padStart(2, '0');
		const g = Math.min(255, Math.max(0, color.g)).toString(16).padStart(2, '0');
		const b = Math.min(255, Math.max(0, color.b)).toString(16).padStart(2, '0');
		return `#${r}${g}${b}`;
	});
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): RGB | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16),
	} : null;
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(rgb: RGB): string {
	const r = Math.min(255, Math.max(0, rgb.r)).toString(16).padStart(2, '0');
	const g = Math.min(255, Math.max(0, rgb.g)).toString(16).padStart(2, '0');
	const b = Math.min(255, Math.max(0, rgb.b)).toString(16).padStart(2, '0');
	return `#${r}${g}${b}`;
}

/**
 * Calculate luminance of a color
 */
export function getLuminance(hex: string): number {
	const rgb = hexToRgb(hex);
	if (!rgb) return 0;

	// Use relative luminance formula
	const r = rgb.r / 255;
	const g = rgb.g / 255;
	const b = rgb.b / 255;

	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Determine if a color is light or dark
 */
export function isLightColor(hex: string): boolean {
	return getLuminance(hex) > 0.5;
}

/**
 * Get contrasting text color (black or white) for a background
 */
export function getContrastingColor(backgroundColor: string): string {
	return isLightColor(backgroundColor) ? '#000000' : '#ffffff';
}
