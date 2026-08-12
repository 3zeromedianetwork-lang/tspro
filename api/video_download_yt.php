<?php
require_once 'video_config.php';
setCORSHeaders();
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $url = $input['url'] ?? '';
    $videoId = $input['videoId'] ?? '';
    
    // CRITICAL FIX: Convert Facebook URLs to m.facebook.com (Mobile version)
    // yt-dlp often fails to parse Facebook's complex desktop HTML, but easily parses the mobile site!
    if (strpos($url, 'facebook.com') !== false) {
        $url = preg_replace('/https?:\/\/(www\.|web\.)?facebook\.com/', 'https://m.facebook.com', $url);
    }

    if (!$url || !$videoId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing url or videoId']);
        exit;
    }

    $outputPath = TEMP_DIR . $videoId . '.mp4';
    
    $progressFile = TEMP_DIR . $videoId . '_progress.txt';
    
    // Download using yt-dlp without requiring ffmpeg to merge, output to progress file
    $cmd = '"' . realpath(YTDLP_PATH) . '" --js-runtimes "' . NODE_PATH . '" -f "b[ext=mp4]/best" --newline -o ' . escapeshellarg($outputPath) . ' ' . escapeshellarg($url) . ' > ' . escapeshellarg($progressFile) . ' 2>&1';
    $output = [];
    $returnVar = 0;
    exec($cmd, $output, $returnVar);

    // Read the file content for error logging if needed
    if (file_exists($progressFile)) {
        $output = file($progressFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    }

    if ($returnVar !== 0 || !file_exists($outputPath)) {
        throw new Exception("yt-dlp failed (code $returnVar): " . implode("\n", $output) . " | Cmd: $cmd");
    }

    // Skip metadata extraction since ffprobe is not installed
    // The browser's native video player will handle metadata extraction automatically
    
    $metadata = [
        'duration' => 0,
        'resolution' => 'unknown',
        'fps' => 0,
        'bitrate' => 0
    ];

    // Update videos.json
    $dataFile = DATA_DIR . 'videos.json';
    if (file_exists($dataFile)) {
        $data = json_decode(file_get_contents($dataFile), true);
        foreach ($data['videos'] as &$video) {
            if ($video['id'] === $videoId) {
                $video['status'] = 'downloaded';
                $video['metadata'] = $metadata;
                break;
            }
        }
        file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT));
    }

    echo json_encode([
        'success' => true,
        'path' => $outputPath,
        'metadata' => $metadata
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
