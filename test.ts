/**
 * Complete integration test - Spotify album/song to poster
 * Uses: Spotify provider, Cover fetcher, Label fetcher, Auto background
 */

import {
	Frameify,
	Integrations,
	type AlbumData,
	type SongData,
	type SpotifySongData,
} from './src';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function generateAlbumPoster(url: string) {
	console.log('🎵 Frameify - Album Poster Generation\n');
	console.log('='.repeat(80));

	// Step 1: Fetch album data from Spotify
	console.log('\n📀 Step 1: Fetching album data from Spotify...');
	const spotifyProvider = new Integrations.Providers.Spotify();
	const albumData = await spotifyProvider.fetchData(url);

	console.log(`   ✅ Album: ${albumData.title}`);
	console.log(`   ✅ Artist: ${albumData.artist}`);
	console.log(`   ✅ Tracks: ${albumData.tracks.length}`);
	console.log(`   ✅ Release Date: ${albumData.releaseDate}`);

	// Step 2: Fetch high-res cover art
	console.log('\n🖼️  Step 2: Fetching high-resolution cover art...');
	const coverResult = await Integrations.Fetch.getBestAlbumCover(albumData.artist, albumData.title);

	let coverImagePath = albumData.coverImagePath;
	if (coverResult) {
		console.log(`   ✅ Found cover from: ${coverResult.source}`);
		console.log(`   ✅ Big cover URL: ${coverResult.bigCoverUrl}`);

		// Download the high-res cover
		const response = await fetch(coverResult.bigCoverUrl);
		const buffer = await response.arrayBuffer();
		const coverPath = join(tmpdir(), 'frameify-cover.jpg');
		await writeFile(coverPath, Buffer.from(buffer));
		coverImagePath = coverPath;
		console.log(`   ✅ Downloaded to: ${coverPath}`);
	} else {
		console.log('   ⚠️  Using Spotify cover (no high-res found)');
	}

	// Step 3: Fetch record label information
	console.log('\n🏷️  Step 3: Fetching record label information...');
	const labelFetcher = new Integrations.Fetch.Label();
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

	await Frameify.create<AlbumData>()
		.withRegisteredDesign('album-1', {
			textColor: '#ffffff',
			dividerColor: '#ffffff',
		})
		.withAutoBackground({ direction: 'lightToDark' })
		.generate(finalAlbumData, outputPath);

	console.log(`   ✅ Poster saved to: ${outputPath}`);

	console.log('\n' + '='.repeat(80));
	console.log('🎉 Complete! Album poster generated successfully!\n');

	// Summary
	console.log('📊 Summary:');
	console.log(`   • Album: ${finalAlbumData.title}`);
	console.log(`   • Artist: ${finalAlbumData.artist}`);
	console.log(`   • Tracks: ${finalAlbumData.tracks.length}`);
	console.log(`   • Label: ${finalAlbumData.label || 'Unknown'}`);
	console.log(`   • Cover: ${coverResult ? `${coverResult.source}` : 'Spotify'}`);
	console.log(`   • Output: ${outputPath}`);
}

async function generateSongPoster(url: string) {
	console.log('🎵 Frameify - Song Poster Generation\n');
	console.log('='.repeat(80));

	// Step 1: Fetch song data from Spotify (includes album data)
	console.log('\n🎵 Step 1: Fetching song data from Spotify...');
	const spotifyProvider = new Integrations.Providers.Spotify();
	const trackData = await spotifyProvider.fetchTrackData(url);

	if (!trackData.album) {
		throw new Error('Could not fetch album data for track');
	}

	const albumData = trackData.album;

	// Find the current track in the album
	const currentTrackIndex = albumData.tracks.findIndex(
		(track) => track.title === trackData.title,
	);

	if (currentTrackIndex === -1) {
		throw new Error('Could not find track in album');
	}

	const currentTrack = albumData.tracks[currentTrackIndex];

	// Convert to SongData with full album context
	const songData: SongData = {
		title: trackData.title,
		artist: trackData.artist,
		album: albumData.title,
		coverImagePath: albumData.coverImagePath,
		releaseDate: albumData.releaseDate,
		duration: currentTrack.duration,
		progress: 0.8, // 80% progress
		copyright: albumData.copyright,
		label: albumData.label,
		genres: albumData.genres,
		trackNumber: currentTrackIndex + 1,
		totalTracks: albumData.tracks.length,
		isrc: currentTrack.isrc,
	};

	console.log(`   ✅ Song: ${songData.title}`);
	console.log(`   ✅ Artist: ${songData.artist}`);
	console.log(`   ✅ Album: ${songData.album}`);
	console.log(`   ✅ Track Number: ${songData.trackNumber} of ${albumData.tracks.length}`);
	if (songData.releaseDate) console.log(`   ✅ Release Date: ${songData.releaseDate}`);
	if (songData.duration) {
		const minutes = Math.floor(songData.duration / 60);
		const seconds = songData.duration % 60;
		console.log(`   ✅ Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`);
	}

	// Step 2: Fetch high-res cover art
	console.log('\n🖼️  Step 2: Fetching high-resolution cover art...');
	const coverResult = await Integrations.Fetch.getBestAlbumCover(songData.artist, songData.album || '');

	let coverImagePath = songData.coverImagePath;
	if (coverResult) {
		console.log(`   ✅ Found cover from: ${coverResult.source}`);
		console.log(`   ✅ Big cover URL: ${coverResult.bigCoverUrl}`);

		// Download the high-res cover
		const response = await fetch(coverResult.bigCoverUrl);
		const buffer = await response.arrayBuffer();
		const coverPath = join(tmpdir(), 'frameify-cover.jpg');
		await writeFile(coverPath, Buffer.from(buffer));
		coverImagePath = coverPath;
		console.log(`   ✅ Downloaded to: ${coverPath}`);
	} else {
		console.log('   ⚠️  Using Spotify cover (no high-res found)');
	}

	// Step 3: Fetch record label information
	console.log('\n🏷️  Step 3: Fetching record label information...');
	const labelFetcher = new Integrations.Fetch.Label();
	const labelInfo = await labelFetcher.getLabel({
		artist: songData.artist,
		album: songData.album || '',
		barcode: coverResult?.releaseInfo.barcode,
	});

	if (labelInfo) {
		console.log(`   ✅ Label: ${labelInfo.name}`);
		if (labelInfo.catalogNumber) {
			console.log(`   ✅ Catalog: ${labelInfo.catalogNumber}`);
		}
		songData.label = labelInfo.name;
	} else {
		console.log('   ⚠️  No label information found');
	}

	// Step 4: Prepare final song data
	const finalSongData: SongData = {
		...songData,
		coverImagePath,
	};

	// Step 5: Generate poster with auto background
	console.log('\n🎨 Step 4: Generating poster with auto background...');
	const outputPath = './poster.png';

	await Frameify.create<SongData>()
		.withRegisteredDesign('song-1', {
			textColor: '#ffffff',
			dividerColor: '#ffffff',
			iconColor: '#ffffff',
		})
		.withAutoBackground({ direction: 'lightToDark' })
		.generate(finalSongData, outputPath);

	console.log(`   ✅ Poster saved to: ${outputPath}`);

	console.log('\n' + '='.repeat(80));
	console.log('🎉 Complete! Song poster generated successfully!\n');

	// Summary
	console.log('📊 Summary:');
	console.log(`   • Song: ${finalSongData.title}`);
	console.log(`   • Artist: ${finalSongData.artist}`);
	if (finalSongData.album) console.log(`   • Album: ${finalSongData.album}`);
	console.log(`   • Label: ${finalSongData.label || 'Unknown'}`);
	console.log(`   • Cover: ${coverResult ? `${coverResult.source}` : 'Spotify'}`);
	console.log(`   • Output: ${outputPath}`);
}

async function generateSpotifySongPoster(url: string) {
	console.log('🎵 Frameify - Spotify Song Poster Generation\n');
	console.log('='.repeat(80));

	// Step 1: Fetch song data from Spotify (includes album data)
	console.log('\n🎵 Step 1: Fetching song data from Spotify...');
	const spotifyProvider = new Integrations.Providers.Spotify();
	const trackData = await spotifyProvider.fetchTrackData(url);

	if (!trackData.album) {
		throw new Error('Could not fetch album data for track');
	}

	const albumData = trackData.album;

	// Find the current track in the album
	const currentTrackIndex = albumData.tracks.findIndex(
		(track) => track.title === trackData.title,
	);

	if (currentTrackIndex === -1) {
		throw new Error('Could not find track in album');
	}

	const currentTrack = albumData.tracks[currentTrackIndex];

	// Convert to SpotifySongData with Spotify-specific features
	const songData: SpotifySongData = {
		title: trackData.title,
		artist: trackData.artist,
		album: albumData.title,
		coverImagePath: albumData.coverImagePath,
		releaseDate: albumData.releaseDate,
		duration: currentTrack.duration,
		progress: 0.65, // 65% progress for demo
		copyright: albumData.copyright,
		label: albumData.label,
		genres: albumData.genres,
		trackNumber: currentTrackIndex + 1,
		totalTracks: albumData.tracks.length,
		isrc: currentTrack.isrc,
		spotifyUri: trackData.spotifyUri, // Spotify-specific
	};

	console.log(`   ✅ Song: ${songData.title}`);
	console.log(`   ✅ Artist: ${songData.artist}`);
	console.log(`   ✅ Album: ${songData.album}`);
	console.log(`   ✅ Track Number: ${songData.trackNumber} of ${songData.totalTracks}`);
	console.log(`   ✅ Spotify URI: ${songData.spotifyUri}`);
	if (songData.releaseDate) console.log(`   ✅ Release Date: ${songData.releaseDate}`);
	if (songData.duration) {
		const minutes = Math.floor(songData.duration / 60);
		const seconds = songData.duration % 60;
		console.log(`   ✅ Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`);
	}

	// Step 2: Fetch high-res cover art
	console.log('\n🖼️  Step 2: Fetching high-resolution cover art...');
	const coverResult = await Integrations.Fetch.getBestAlbumCover(songData.artist, songData.album || '');

	let coverImagePath = songData.coverImagePath;
	if (coverResult) {
		console.log(`   ✅ Found cover from: ${coverResult.source}`);
		console.log(`   ✅ Big cover URL: ${coverResult.bigCoverUrl}`);

		// Download the high-res cover
		const response = await fetch(coverResult.bigCoverUrl);
		const buffer = await response.arrayBuffer();
		const coverPath = join(tmpdir(), 'frameify-cover.jpg');
		await writeFile(coverPath, Buffer.from(buffer));
		coverImagePath = coverPath;
		console.log(`   ✅ Downloaded to: ${coverPath}`);
	} else {
		console.log('   ⚠️  Using Spotify cover (no high-res found)');
	}

	// Step 3: Fetch record label information
	console.log('\n🏷️  Step 3: Fetching record label information...');
	const labelFetcher = new Integrations.Fetch.Label();
	const labelInfo = await labelFetcher.getLabel({
		artist: songData.artist,
		album: songData.album || '',
		barcode: coverResult?.releaseInfo.barcode,
	});

	if (labelInfo) {
		console.log(`   ✅ Label: ${labelInfo.name}`);
		if (labelInfo.catalogNumber) {
			console.log(`   ✅ Catalog: ${labelInfo.catalogNumber}`);
		}
		songData.label = labelInfo.name;
	} else {
		console.log('   ⚠️  No label information found');
	}

	// Step 4: Prepare final song data
	const finalSongData: SpotifySongData = {
		...songData,
		coverImagePath,
	};

	// Step 5: Generate poster with Spotify design and auto background
	console.log('\n🎨 Step 4: Generating Spotify poster with auto background...');
	const outputPath = './spotify-poster.png';

	await Frameify.create<SpotifySongData>()
		.withRegisteredDesign('spotify-song', {
			textColor: '#ffffff',
			iconColor: '#ffffff',
			spotifyCodeColor: '#1DB954', // Spotify green
		})
		.withAutoBackground({ direction: 'lightToDark' })
		.generate(finalSongData, outputPath);

	console.log(`   ✅ Spotify poster saved to: ${outputPath}`);

	console.log('\n' + '='.repeat(80));
	console.log('🎉 Complete! Spotify song poster generated successfully!\n');

	// Summary
	console.log('📊 Summary:');
	console.log(`   • Song: ${finalSongData.title}`);
	console.log(`   • Artist: ${finalSongData.artist}`);
	if (finalSongData.album) console.log(`   • Album: ${finalSongData.album}`);
	console.log(`   • Track: ${finalSongData.trackNumber} of ${finalSongData.totalTracks}`);
	console.log(`   • Spotify URI: ${finalSongData.spotifyUri}`);
	console.log(`   • Label: ${finalSongData.label || 'Unknown'}`);
	console.log(`   • Cover: ${coverResult ? `${coverResult.source}` : 'Spotify'}`);
	console.log(`   • Output: ${outputPath}`);
}

// Parse command line arguments
const mode = process.argv[2];
const url = process.argv[3];

if (!mode || !url) {
	console.error('❌ Error: Please provide a mode and URL');
	console.log('\nUsage: bun test.ts <mode> <url>');
	console.log('\nModes:');
	console.log('  album        - Generate album poster');
	console.log('  song         - Generate song poster');
	console.log('  song-spotify - Generate Spotify song poster with scannable code');
	console.log('\nExamples:');
	console.log('  bun test.ts album https://open.spotify.com/album/5Wvcnn5547f6xz8F9Kz6rO');
	console.log('  bun test.ts song https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp');
	console.log('  bun test.ts song-spotify https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp');
	process.exit(1);
}

// Validate mode
if (mode !== 'album' && mode !== 'song' && mode !== 'song-spotify') {
	console.error(`❌ Error: Invalid mode "${mode}". Use "album", "song", or "song-spotify"`);
	process.exit(1);
}

// Run the appropriate generator
if (mode === 'album') {
	generateAlbumPoster(url).catch(console.error);
} else if (mode === 'song') {
	generateSongPoster(url).catch(console.error);
} else if (mode === 'song-spotify') {
	generateSpotifySongPoster(url).catch(console.error);
}
