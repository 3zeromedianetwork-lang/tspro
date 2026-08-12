<?php
require_once 'video_config.php';
setCORSHeaders();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Invalid request method']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$url = $input['url'] ?? '';

$url = trim($url);
if (!preg_match('/^https?:\/\//i', $url)) {
    $url = 'https://' . $url;
}

if (!$url || !filter_var($url, FILTER_VALIDATE_URL)) {
    echo json_encode(['success' => false, 'error' => 'Invalid URL']);
    exit;
}

$videoId = 'bulk_' . time() . '_' . bin2hex(random_bytes(4));
$outputPath = TEMP_DIR . $videoId . '.mp4';

$ytdlpPath = realpath(YTDLP_PATH);
if (!$ytdlpPath || !file_exists($ytdlpPath)) {
    echo json_encode(['success' => false, 'error' => 'yt-dlp not found']);
    exit;
}

$cmd = '"' . $ytdlpPath . '" -f "best[ext=mp4]/best" --no-mtime -o ' . escapeshellarg($outputPath) . ' ' . escapeshellarg($url) . ' 2>&1';
$output = [];
$returnVar = 0;
exec($cmd, $output, $returnVar);

if ($returnVar !== 0 || !file_exists($outputPath)) {
    echo json_encode([
        'success' => false,
        'error' => 'Download failed',
        'log' => implode("\n", $output)
    ]);
    exit;
}

echo json_encode([
    'success' => true,
    'path' => $outputPath,
    'url' => './temp/' . $videoId . '.mp4'
]);
