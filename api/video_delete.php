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
    $id = $input['id'] ?? '';
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing video ID']);
        exit;
    }

    $dataFile = DATA_DIR . 'videos.json';
    if (!file_exists($dataFile)) {
        echo json_encode(['success' => true]); // Nothing to delete
        exit;
    }

    $data = json_decode(file_get_contents($dataFile), true);
    $newData = ['videos' => []];
    $deleted = false;

    foreach ($data['videos'] as $video) {
        if ($video['id'] === $id) {
            $deleted = true;
            continue; // Skip
        }
        $newData['videos'][] = $video;
    }

    if ($deleted) {
        file_put_contents($dataFile, json_encode($newData, JSON_PRETTY_PRINT));
        
        $tempFile = TEMP_DIR . $id . '.mp4';
        if (file_exists($tempFile)) @unlink($tempFile);
        
        $outputFile = OUTPUT_DIR . $id . '.mp4';
        if (file_exists($outputFile)) @unlink($outputFile);
    }

    echo json_encode(['success' => true]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
