<?php
require_once 'video_config.php';
setCORSHeaders();
header('Content-Type: application/json');

$file = $_GET['file'] ?? '';

if (!$file) {
    echo json_encode(['success' => false, 'error' => 'No log file specified']);
    exit;
}

// Sanitize filename
$file = basename($file);
$logPath = TEMP_DIR . $file;

if (!file_exists($logPath)) {
    echo json_encode(['success' => false, 'error' => 'Log file not found']);
    exit;
}

$logContent = file_get_contents($logPath);

echo json_encode([
    'success' => true,
    'log' => $logContent
]);
