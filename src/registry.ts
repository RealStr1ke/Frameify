/**
 * Design Registry - Centralized management for all poster designs
 */

/**
 * Metadata for a registered design
 */
export interface DesignMetadata {
	/** Unique identifier for the design */
	name: string;
	/** Human-readable display name */
	displayName: string;
	/** Description of the design */
	description: string;
	/** Category: album or song poster */
	category: 'album' | 'song';
	/** Target platform (optional) */
	platform?: 'spotify' | 'apple-music' | 'youtube-music' | 'soundcloud' | 'generic';
	/** Design version */
	version: string;
	/** Author/creator */
	author?: string;
	/** Tags for categorization */
	tags?: string[];
	/** Required data fields for this design */
	requiredDataFields?: string[];
	/** Supported output formats */
	supportedFormats?: ('png' | 'jpg' | 'svg')[];
}

/**
 * Registry entry combining design class and metadata
 */
interface RegistryEntry {
	designClass: any;
	metadata: DesignMetadata;
}

/**
 * Centralized registry for all poster designs
 */
class DesignRegistry {
	private designs = new Map<string, RegistryEntry>();

	/**
	 * Register a design with metadata
	 */
	register(designClass: any, metadata: DesignMetadata): void {
		if (this.designs.has(metadata.name)) {
			console.warn(`Design "${metadata.name}" is already registered. Overwriting...`);
		}

		this.designs.set(metadata.name, {
			designClass,
			metadata,
		});

		console.log(`✅ Registered design: ${metadata.name} (${metadata.displayName})`);
	}

	/**
	 * Get registry entry by name
	 */
	get(name: string): RegistryEntry | undefined {
		return this.designs.get(name);
	}

	/**
	 * Create design instance with optional config
	 */
	create(name: string, config?: any): any {
		const entry = this.designs.get(name);
		if (!entry) {
			throw new Error(`Design "${name}" not found in registry. Available designs: ${this.list().join(', ')}`);
		}

		return new entry.designClass(config);
	}

	/**
	 * Get metadata for a design
	 */
	getMetadata(name: string): DesignMetadata | undefined {
		return this.designs.get(name)?.metadata;
	}

	/**
	 * List all registered design names
	 */
	list(): string[] {
		return Array.from(this.designs.keys());
	}

	/**
	 * List designs by category
	 */
	listByCategory(category: 'album' | 'song'): string[] {
		return Array.from(this.designs.entries())
			.filter(([, entry]) => entry.metadata.category === category)
			.map(([name]) => name);
	}

	/**
	 * List designs by platform
	 */
	listByPlatform(platform: string): string[] {
		return Array.from(this.designs.entries())
			.filter(([, entry]) => entry.metadata.platform === platform || entry.metadata.platform === 'generic')
			.map(([name]) => name);
	}

	/**
	 * Get all album designs
	 */
	getAlbumDesigns(): string[] {
		return this.listByCategory('album');
	}

	/**
	 * Get all song designs
	 */
	getSongDesigns(): string[] {
		return this.listByCategory('song');
	}

	/**
	 * Get Spotify-specific designs
	 */
	getSpotifyDesigns(): string[] {
		return this.listByPlatform('spotify');
	}

	/**
	 * Get Apple Music-specific designs
	 */
	getAppleMusicDesigns(): string[] {
		return this.listByPlatform('apple-music');
	}

	/**
	 * Get YouTube Music-specific designs
	 */
	getYouTubeMusicDesigns(): string[] {
		return this.listByPlatform('youtube-music');
	}

	/**
	 * Get SoundCloud-specific designs
	 */
	getSoundCloudDesigns(): string[] {
		return this.listByPlatform('soundcloud');
	}

	/**
	 * Get generic designs (work with any platform)
	 */
	getGenericDesigns(): string[] {
		return Array.from(this.designs.entries())
			.filter(([, entry]) => entry.metadata.platform === 'generic')
			.map(([name]) => name);
	}

	/**
	 * Get recommended designs for specific data type and platform
	 */
	getRecommendedDesigns(dataType: 'album' | 'song', platform?: string): string[] {
		const designs = this.listByCategory(dataType);

		if (platform) {
			// Prefer platform-specific designs first, then generic
			const platformSpecific = designs.filter(name => {
				const meta = this.getMetadata(name);
				return meta?.platform === platform;
			});

			const generic = designs.filter(name => {
				const meta = this.getMetadata(name);
				return meta?.platform === 'generic';
			});

			return [...platformSpecific, ...generic];
		}

		return designs;
	}

	/**
	 * Validate if design can handle the provided data
	 */
	canHandleData(designName: string, data: any): boolean {
		const metadata = this.getMetadata(designName);
		if (!metadata?.requiredDataFields || metadata.requiredDataFields.length === 0) {
			return true; // No specific requirements
		}

		return metadata.requiredDataFields.every(field =>
			Object.prototype.hasOwnProperty.call(data, field) && data[field] != null,
		);
	}

	/**
	 * Get designs that can handle specific data
	 */
	getCompatibleDesigns(data: any, category?: 'album' | 'song'): string[] {
		const designs = category ? this.listByCategory(category) : this.list();

		return designs.filter(name => this.canHandleData(name, data));
	}

	/**
	 * Search designs by tags
	 */
	searchByTags(tags: string[]): string[] {
		return Array.from(this.designs.entries())
			.filter(([, entry]) => {
				if (!entry.metadata.tags) return false;
				return tags.some(tag => entry.metadata.tags!.includes(tag));
			})
			.map(([name]) => name);
	}

	/**
	 * Get full registry information for debugging/tooling
	 */
	getRegistryInfo(): Record<string, DesignMetadata> {
		const info: Record<string, DesignMetadata> = {};
		for (const [name, entry] of this.designs) {
			info[name] = entry.metadata;
		}
		return info;
	}

	/**
	 * Clear all registered designs (for testing)
	 */
	clear(): void {
		this.designs.clear();
	}

	/**
	 * Check if design exists
	 */
	has(name: string): boolean {
		return this.designs.has(name);
	}

	/**
	 * Get total number of registered designs
	 */
	size(): number {
		return this.designs.size;
	}
}

/**
 * Global design registry instance
 */
export const designRegistry = new DesignRegistry();

/**
 * Type for design registration function
 */
export type RegisterDesignFunction = (designClass: any, metadata: DesignMetadata) => void;