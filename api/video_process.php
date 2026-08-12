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

    // Extract YouTube ID
    preg_match('/(?:shorts\/|v=|youtu\.be\/|\/v\/|\/embed\/)([a-zA-Z0-9_-]{11})/', $url, $matches);
    $ytId = $matches[1] ?? null;

    if (!$ytId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid YouTube URL']);
        exit;
    }

    $videoId = 'vid_' . $ytId;
    $binYtDlp = __DIR__ . '/../bin/yt-dlp.exe';
    $outputDir = OUTPUT_DIR;
    $targetFile = $outputDir . $ytId . '.mp4';

    // If file doesn't exist yet, download using yt-dlp.exe
    if (!file_exists($targetFile) && file_exists($binYtDlp)) {
        $cmd = sprintf('"%s" -f "best[ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best" -o "%s" --no-playlist "%s"', $binYtDlp, $targetFile, $url);
        exec($cmd . ' 2>&1', $output, $returnCode);
    }

    // Save to videos.json
    $dataFile = DATA_DIR . 'videos.json';
    $data = file_exists($dataFile) ? json_decode(file_get_contents($dataFile), true) : ['videos' => []];
    
    $videoRecord = [
        'id' => $videoId,
        'ytId' => $ytId,
        'url' => $url,
        'title' => 'YouTube Short (' . $ytId . ')',
        'status' => 'completed',
        'output_file' => file_exists($targetFile) ? $targetFile : null,
        'created_at' => date('c')
    ];
    
    $data['videos'][] = $videoRecord;
    file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT));

    echo json_encode([
        'success' => true,
        'videoId' => $videoId,
        'ytId' => $ytId,
        'downloadUrl' => 'api/video_download.php?id=' . $ytId,
        'message' => 'Video processed and downloaded successfully'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
