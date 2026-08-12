<?php
require_once 'video_config.php';
setCORSHeaders();
header('Content-Type: application/json');

$token = 'apify_api_pqWPUf0ZMYCsZ5sXCrdeMrjf5sMf0o4A09OZ';

$input = json_decode(file_get_contents('php://input'), true);
$url = $input['url'] ?? '';

if (!$url) {
    echo json_encode(['success' => false, 'error' => 'URL is required']);
    exit;
}

$apifyActor = '';
$apifyInput = [];

if (strpos($url, 'tiktok.com') !== false) {
    $apifyActor = 'clockwork~tiktok-scraper';
    $apifyInput = [
        'postURLs' => [$url],
        'resultsPerPage' => 1,
        'shouldDownloadVideos' => true
    ];
} else if (strpos($url, 'instagram.com') !== false) {
    $apifyActor = 'apify~instagram-scraper';
    $apifyInput = [
        'directUrls' => [$url],
        'resultsType' => 'posts',
        'resultsLimit' => 1
    ];
} else if (strpos($url, 'facebook.com') !== false || strpos($url, 'fb.watch') !== false) {
    $apifyActor = 'apify~facebook-pages-scraper'; // Generic fallback, but usually requires login.
    echo json_encode(['success' => false, 'error' => 'Please use TikTok or Instagram URLs for Apify currently.']);
    exit;
} else {
    echo json_encode(['success' => false, 'error' => 'Platform not supported by this Apify integration yet.']);
    exit;
}

$apiUrl = "https://api.apify.com/v2/acts/$apifyActor/run-sync-get-dataset-items?token=$token";

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($apifyInput));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 201 && $httpCode !== 200) {
    echo json_encode(['success' => false, 'error' => 'Apify Error', 'details' => json_decode($response, true)]);
    exit;
}

$data = json_decode($response, true);
if (empty($data)) {
    echo json_encode(['success' => false, 'error' => 'No data returned from Apify']);
    exit;
}

$videoUrl = '';

if ($apifyActor === 'clockwork~tiktok-scraper') {
    if (isset($data[0]['videoMeta']['downloadAddr'])) {
        $videoUrl = $data[0]['videoMeta']['downloadAddr'];
    }
} else if ($apifyActor === 'apify~instagram-scraper') {
    if (isset($data[0]['videoUrl'])) {
        $videoUrl = $data[0]['videoUrl'];
    }
}

if (empty($videoUrl)) {
    echo json_encode(['success' => false, 'error' => 'Could not extract video URL from Apify response.']);
    exit;
}

$videoId = 'vid_' . time();
$tempFile = TEMP_DIR . $videoId . '.mp4';

// Download the actual video file
file_put_contents($tempFile, fopen($videoUrl, 'r'));

if (file_exists($tempFile)) {
    echo json_encode([
        'success' => true,
        'path' => './temp/' . $videoId . '.mp4',
        'id' => $videoId
    ]);
} else {
    echo json_encode(['success' => false, 'error' => 'Failed to save downloaded video file.']);
}
?>
