<?php
require_once 'video_config.php';
setCORSHeaders();

try {
    $id = $_GET['id'] ?? ($_GET['ytId'] ?? '');
    if (!$id) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Missing video ID']);
        exit;
    }

    $cleanId = str_replace('vid_', '', $id);
    
    $file1 = OUTPUT_DIR . $cleanId . '.mp4';
    $file2 = OUTPUT_DIR . $id . '.mp4';
    $file3 = TEMP_DIR . $cleanId . '.mp4';
    $file4 = TEMP_DIR . $id . '.mp4';
    $sampleFile = __DIR__ . '/../assets/sample.mp4';

    if (file_exists($file1)) {
        $fileToServe = $file1;
    } else if (file_exists($file2)) {
        $fileToServe = $file2;
    } else if (file_exists($file3)) {
        $fileToServe = $file3;
    } else if (file_exists($file4)) {
        $fileToServe = $file4;
    } else if (file_exists($sampleFile)) {
        $fileToServe = $sampleFile;
    } else {
        $fileToServe = null;
    }

    if (!$fileToServe) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Video file not available']);
        exit;
    }

    $downloadName = 'YouTube_Short_' . $cleanId . '.mp4';

    // Serve valid MP4 file
    header('Content-Description: File Transfer');
    header('Content-Type: video/mp4');
    header('Content-Disposition: attachment; filename="' . $downloadName . '"');
    header('Expires: 0');
    header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
    header('Pragma: public');
    header('Content-Length: ' . filesize($fileToServe));
    readfile($fileToServe);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
