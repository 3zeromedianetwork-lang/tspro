<?php
require_once 'video_config.php';
setCORSHeaders();
header('Content-Type: application/json');

$id = $_GET['id'] ?? '';
if (!$id) {
    echo json_encode(['progress' => null]);
    exit;
}

$progressFile = TEMP_DIR . $id . '_progress.txt';
if (file_exists($progressFile)) {
    // Read the last few lines to find the latest progress
    $lines = file($progressFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines) {
        // Reverse array to start from the end
        $lines = array_reverse($lines);
        foreach ($lines as $line) {
            if (preg_match('/\[download\]\s+([\d\.]+)%/', $line, $matches)) {
                echo json_encode(['progress' => $matches[1]]);
                exit;
            }
        }
    }
}

echo json_encode(['progress' => null]);
