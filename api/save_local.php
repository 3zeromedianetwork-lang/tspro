<?php
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['image'])) {
    echo json_encode(['success' => false, 'error' => 'No image data provided']);
    exit;
}

$outputDir = __DIR__ . '/../NewsOutput';
if (!file_exists($outputDir)) {
    mkdir($outputDir, 0777, true);
}

// Save Image
$imgData = $data['image'];
$imgData = str_replace('data:image/png;base64,', '', $imgData);
$imgData = str_replace(' ', '+', $imgData);
$fileData = base64_decode($imgData);

$filename = 'News_' . date('Ymd_His') . '.png';
$filepath = $outputDir . '/' . $filename;

if (file_put_contents($filepath, $fileData)) {
    // Documentation: Append to CSV
    $csvFile = $outputDir . '/NewsLog.csv';
    $isNew = !file_exists($csvFile);
    $fp = fopen($csvFile, 'a');
    
    if ($isNew) {
        fputcsv($fp, ['Date', 'Title', 'Original URL', 'Filename']);
    }
    
    fputcsv($fp, [
        date('Y-m-d H:i:s'),
        $data['title'] ?? 'Untitled',
        $data['url'] ?? 'N/A',
        $filename
    ]);
    fclose($fp);

    echo json_encode(['success' => true, 'filename' => $filename, 'path' => $filepath]);
} else {
    echo json_encode(['success' => false, 'error' => 'Failed to save file']);
}
