<?php
require_once 'video_config.php';
setCORSHeaders();
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        exit;
    }

    $dataFile = DATA_DIR . 'videos.json';
    $data = file_exists($dataFile) ? json_decode(file_get_contents($dataFile), true) : ['videos' => []];

    $videos = $data['videos'] ?? [];
    
    // Sort by created_at descending
    usort($videos, function($a, $b) {
        return strtotime($b['created_at']) - strtotime($a['created_at']);
    });

    echo json_encode(['success' => true, 'videos' => $videos]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
