<?php
// Prevent PHP from outputting HTML warnings/errors that break JSON parsing
ini_set('display_errors', 0);
error_reporting(0);

header('Content-Type: application/json');

$tempDir = dirname(__DIR__) . '/temp/';
if (!is_dir($tempDir)) {
    mkdir($tempDir, 0777, true);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Invalid request method']);
    exit;
}

if (empty($_FILES) && isset($_SERVER['CONTENT_LENGTH']) && (int)$_SERVER['CONTENT_LENGTH'] > 0) {
    echo json_encode(['success' => false, 'error' => 'File size exceeds PHP server limits (post_max_size). Please upload a smaller video or increase your XAMPP upload limits.']);
    exit;
}

if (!isset($_FILES['video_file'])) {
    echo json_encode(['success' => false, 'error' => 'No video file provided']);
    exit;
}

$file = $_FILES['video_file'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'error' => 'File upload error code: ' . $file['error']]);
    exit;
}

// Generate unique ID
$videoId = 'up_' . bin2hex(random_bytes(8));
$destination = $tempDir . $videoId . '.mp4';

if (move_uploaded_file($file['tmp_name'], $destination)) {
    echo json_encode([
        'success' => true,
        'videoId' => $videoId,
        'url' => './temp/' . $videoId . '.mp4'
    ]);
} else {
    echo json_encode(['success' => false, 'error' => 'Failed to move uploaded file']);
}
?>
