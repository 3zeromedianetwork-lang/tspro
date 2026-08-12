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

    $id = $_GET['id'] ?? '';
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing video ID']);
        exit;
    }

    $dataFile = DATA_DIR . 'videos.json';
    if (!file_exists($dataFile)) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Data file not found']);
        exit;
    }

    $data = json_decode(file_get_contents($dataFile), true);
    $found = false;

    foreach ($data['videos'] as $video) {
        if ($video['id'] === $id) {
            $found = $video;
            break;
        }
    }

    if ($found) {
        echo json_encode(['success' => true, 'video' => $found]);
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Video not found']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
