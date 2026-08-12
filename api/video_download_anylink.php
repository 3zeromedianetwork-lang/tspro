<?php
require_once 'video_config.php';
setCORSHeaders();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$rawInput = file_get_contents('php://input');
$rawInput = preg_replace('/^\xEF\xBB\xBF/', '', $rawInput);
$input = json_decode($rawInput, true);
$url = $input['url'] ?? $_GET['url'] ?? '';

if (!$url) {
    echo json_encode(['success' => false, 'error' => 'URL is required']);
    exit;
}

$url = trim($url);
if (!preg_match('/^https?:\/\//i', $url)) {
    $url = 'https://' . $url;
}

if (!filter_var($url, FILTER_VALIDATE_URL)) {
    echo json_encode(['success' => false, 'error' => 'Invalid URL format']);
    exit;
}

// CRITICAL FIX: Convert Facebook URLs to m.facebook.com (Mobile version)
// yt-dlp often fails to parse Facebook's complex desktop HTML, but easily parses the mobile site!
if (strpos($url, 'facebook.com') !== false) {
    $url = preg_replace('/https?:\/\/(www\.|web\.)?facebook\.com/', 'https://m.facebook.com', $url);
}

$videoId = $input['videoId'] ?? ('vid_' . time());
$progressFile = TEMP_DIR . $videoId . '_progress.txt';

function detectPlatform($url) {
    if (preg_match('/youtube\.com|youtu\.be|shorts\.youtube/i', $url)) return 'youtube';
    if (preg_match('/tiktok\.com/i', $url)) return 'tiktok';
    if (preg_match('/instagram\.com/i', $url)) return 'instagram';
    if (preg_match('/twitter\.com|x\.com/i', $url)) return 'twitter';
    if (preg_match('/facebook\.com|fb\.watch|fb\.com/i', $url)) return 'facebook';
    if (preg_match('/reddit\.com/i', $url)) return 'reddit';
    if (preg_match('/pinterest\.com/i', $url)) return 'pinterest';
    if (preg_match('/vimeo\.com/i', $url)) return 'vimeo';
    if (preg_match('/dailymotion\.com/i', $url)) return 'dailymotion';
    if (preg_match('/soundcloud\.com/i', $url)) return 'soundcloud';
    if (preg_match('/twitch\.tv/i', $url)) return 'twitch';
    if (preg_match('/bilibili\.com/i', $url)) return 'bilibili';
    return 'unknown';
}

function getMetadata($url) {
    $ytdlpPath = realpath(YTDLP_PATH);
    if (!file_exists($ytdlpPath)) {
        return ['title' => '', 'thumbnail' => '', 'duration' => 0, 'platform' => detectPlatform($url)];
    }

    $cmd = '"' . $ytdlpPath . '" --dump-json --no-download ' . escapeshellarg($url) . ' 2>/dev/null';
    $jsonOutput = shell_exec($cmd);

    if (!$jsonOutput) {
        return ['title' => '', 'thumbnail' => '', 'duration' => 0, 'platform' => detectPlatform($url)];
    }

    $data = json_decode($jsonOutput, true);
    if (!$data) {
        return ['title' => '', 'thumbnail' => '', 'duration' => 0, 'platform' => detectPlatform($url)];
    }

    return [
        'title' => $data['title'] ?? '',
        'thumbnail' => $data['thumbnail'] ?? '',
        'duration' => intval($data['duration'] ?? 0),
        'platform' => detectPlatform($url)
    ];
}

function runYtdlp($url, $videoId, $progressFile) {
    $outputPath = TEMP_DIR . $videoId . '.mp4';
    $ytdlpPath = realpath(YTDLP_PATH);

    if (!file_exists($ytdlpPath)) {
        return ['error' => "yt-dlp not found at $ytdlpPath"];
    }

    $cmd = '"' . $ytdlpPath . '" --js-runtimes "' . NODE_PATH . '" -f "best[ext=mp4]/best" --newline --no-mtime -o ' . escapeshellarg($outputPath) . ' ' . escapeshellarg($url) . ' 2>&1';

    file_put_contents($progressFile, '0');

    $output = [];
    $returnVar = 0;
    exec($cmd, $output, $returnVar);

    $progressContent = implode("\n", $output);
    file_put_contents($progressFile, $progressContent);

    if ($returnVar !== 0 || !file_exists($outputPath)) {
        return ['error' => "yt-dlp failed (exit code $returnVar)", 'output' => $progressContent];
    }

    return [
        'success' => true,
        'path' => $outputPath,
        'id' => $videoId
    ];
}

$platform = detectPlatform($url);
$response = ['success' => false, 'platform' => $platform, 'url' => $url];

try {
    $response['debug'] = ["Detected platform: $platform", "Fetching metadata..."];

    $metadata = getMetadata($url);
    $response['metadata'] = $metadata;

    $response['debug'][] = "Starting yt-dlp download...";
    file_put_contents($progressFile, 'Downloading...');

    $ytdlpResult = runYtdlp($url, $videoId, $progressFile);

    if (isset($ytdlpResult['error'])) {
        $response['debug'][] = "yt-dlp error: " . $ytdlpResult['error'];
        echo json_encode([
            'success' => false,
            'error' => 'Download failed: ' . $ytdlpResult['error'],
            'debug' => $response['debug'],
            'platform' => $platform
        ]);
        exit;
    }

    $response['debug'][] = "Download complete!";

    $response['success'] = true;
    $response['id'] = $ytdlpResult['id'];
    $response['path'] = $ytdlpResult['path'];
    $response['method'] = 'yt-dlp';
    $response['download_url'] = './api/video_download.php?id=' . $ytdlpResult['id'];
    $response['temp_url'] = './temp/' . $ytdlpResult['id'] . '.mp4';
    $response['message'] = 'Video downloaded successfully';

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => $response['debug'] ?? [],
        'platform' => $platform
    ]);
    exit;
}

echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);