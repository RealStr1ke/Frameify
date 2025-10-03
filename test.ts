/**
 * Complete integration test - Spotify album to poster
 * Uses: Spotify provider, Cover fetcher, Label fetcher, Auto background
 */

import { SpotifyProvider } from './src/integrations/providers/spotify';
import { getBestAlbumCover } from './src/integrations/covers';
import { LabelFetcher } from './src/integrations/label';
import { PosterGenerator } from './src/poster-generator';
import { Album1Design } from './src/designs/album-1';
import type { AlbumData } from './src/types';
import { writeFile } from 'node:fs/promises';

async function generatePosterFromSpotify(url: string) {
	console.log('🎵 Frameify - Complete Integration Test\n');
	console.log('='.repeat(80));

	// Step 1: Fetch album data from Spotify
	console.log('\n📀 Step 1: Fetching album data from Spotify...');
	const spotifyProvider = new SpotifyProvider();
	const albumData = await spotifyProvider.fetchData(url);

	console.log(`   ✅ Album: ${albumData.title}`);
	console.log(`   ✅ Artist: ${albumData.artist}`);
	console.log(`   ✅ Tracks: ${albumData.tracks.length}`);
	console.log(`   ✅ Release Date: ${albumData.releaseDate}`);

	// Step 2: Fetch high-res cover art
	console.log('\n🖼️  Step 2: Fetching high-resolution cover art...');
	const coverResult = await getBestAlbumCover(albumData.artist, albumData.title);

	let coverImagePath = albumData.coverImagePath;
	if (coverResult) {
		console.log(`   ✅ Found cover from: ${coverResult.source}`);
		console.log(`   ✅ Big cover URL: ${coverResult.bigCoverUrl}`);

		// Download the high-res cover
		const response = await fetch(coverResult.bigCoverUrl);
		const buffer = await response.arrayBuffer();
		const coverPath = './covers/high-res-cover.jpg';
		await writeFile(coverPath, Buffer.from(buffer));
		coverImagePath = coverPath;
		console.log(`   ✅ Downloaded to: ${coverPath}`);
	} else {
		console.log('   ⚠️  Using Spotify cover (no high-res found)');
	}

	// Step 3: Fetch record label information
	console.log('\n🏷️  Step 3: Fetching record label information...');
	const labelFetcher = new LabelFetcher();
	const labelInfo = await labelFetcher.getLabel({
		artist: albumData.artist,
		album: albumData.title,
		barcode: coverResult?.releaseInfo.barcode,
	});

	if (labelInfo) {
		console.log(`   ✅ Label: ${labelInfo.name}`);
		if (labelInfo.catalogNumber) {
			console.log(`   ✅ Catalog: ${labelInfo.catalogNumber}`);
		}
		albumData.label = labelInfo.name;
	} else {
		console.log('   ⚠️  No label information found');
	}

	// Step 4: Prepare final album data
	const finalAlbumData: AlbumData = {
		...albumData,
		coverImagePath,
	};

	// Step 5: Generate poster with auto background
	console.log('\n🎨 Step 4: Generating poster with auto background...');
	const outputPath = './poster.png';

	await PosterGenerator.create<AlbumData>()
		.withDesign(new Album1Design({
			textColor: '#ffffff',
			dividerColor: '#ffffff',
		}))
		.withAutoBackground({ direction: 'lightToDark' })
		.generate(finalAlbumData, outputPath);

	console.log(`   ✅ Poster saved to: ${outputPath}`);

	console.log('\n' + '='.repeat(80));
	console.log('🎉 Complete! All integrations working successfully!\n');

	// Summary
	console.log('📊 Summary:');
	console.log(`   • Album: ${finalAlbumData.title}`);
	console.log(`   • Artist: ${finalAlbumData.artist}`);
	console.log(`   • Tracks: ${finalAlbumData.tracks.length}`);
	console.log(`   • Label: ${finalAlbumData.label || 'Unknown'}`);
	console.log(`   • Cover: ${coverResult ? `${coverResult.source}` : 'Spotify'}`);
	console.log(`   • Output: ${outputPath}`);
}

// Get URL from command line argument
const spotifyUrl = process.argv[2];

if (!spotifyUrl) {
	console.error('❌ Error: Please provide a Spotify URL as an argument');
	console.log('\nUsage: bun test.ts <spotify-url>');
	console.log('Example: bun test.ts https://open.spotify.com/album/5Wvcnn5547f6xz8F9Kz6rO');
	process.exit(1);
}

// Run with the provided Spotify URL
generatePosterFromSpotify(spotifyUrl).catch(console.error);
