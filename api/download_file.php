<?php
if (!isset($_GET['file'])) {
    http_response_code(400);
    die(json_encode(['error' => 'No file specified']));
}

// Sanitize filename to prevent directory traversal
$file = basename($_GET['file']);
$filepath = dirname(__DIR__) . '/temp/' . $file;

if (!file_exists($filepath)) {
    http_response_code(404);
    die(json_encode(['error' => 'File not found', 'file' => $file, 'path' => $filepath]));
}

// Force download headers
header('Content-Description: File Transfer');
header('Content-Type: video/mp4');
header('Content-Disposition: attachment; filename="NewsCard_' . time() . '.mp4"');
header('Expires: 0');
header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
header('Pragma: public');
header('Content-Length: ' . filesize($filepath));
header('Accept-Ranges: bytes');

// Read and output the file
readfile($filepath);
exit;
?>
