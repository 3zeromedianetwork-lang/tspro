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
    echo json_encode(['success' => false, 'error' => 'File size exceeds PHP server limits (post_max_size). Please upload a smaller file or increase your XAMPP upload limits.']);
    exit;
}

if (!isset($_FILES['media_file'])) {
    echo json_encode(['success' => false, 'error' => 'No media file provided']);
    exit;
}

$file = $_FILES['media_file'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'error' => 'File upload error code: ' . $file['error']]);
    exit;
}

$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
// Basic security check for extension
$allowed = ['png', 'jpg', 'jpeg', 'mp3', 'wav'];
if (!in_array(strtolower($extension), $allowed)) {
    echo json_encode(['success' => false, 'error' => 'Invalid file extension']);
    exit;
}

$mediaId = 'media_' . bin2hex(random_bytes(8));
$destination = $tempDir . $mediaId . '.' . $extension;

if (move_uploaded_file($file['tmp_name'], $destination)) {
    echo json_encode([
        'success' => true,
        'mediaId' => $mediaId,
        'url' => './temp/' . $mediaId . '.' . $extension
    ]);
} else {
    echo json_encode(['success' => false, 'error' => 'Failed to move uploaded file']);
}
?>
