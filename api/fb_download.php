<?php
/**
 * FB Video Download Proxy
 * Streams the video from Facebook's CDN through our server
 * This avoids CORS issues when downloading directly from fbcdn
 */

$url = $_GET['url'] ?? '';

if (empty($url)) {
    http_response_code(400);
    echo 'URL required';
    exit;
}

// Validate URL - must be from Facebook CDN
if (!preg_match('/fbcdn|facebook|fbvideo|fb\.com/i', $url)) {
    http_response_code(403);
    echo 'Invalid URL source';
    exit;
}

// Get file info first
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_NOBODY         => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    CURLOPT_HTTPHEADER     => [
        'Referer: https://www.facebook.com/',
        'Accept: */*'
    ]
]);
curl_exec($ch);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'video/mp4';
$fileSize = curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
curl_close($ch);

// Set download headers
header('Content-Type: ' . $contentType);
header('Content-Disposition: attachment; filename="fb_video_' . date('Ymd_His') . '.mp4"');
if ($fileSize > 0) {
    header('Content-Length: ' . $fileSize);
}
header('Cache-Control: no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Stream the video with browser-like headers
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_TIMEOUT        => 600, // 10 min timeout
    CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    CURLOPT_HTTPHEADER     => [
        'Referer: https://www.facebook.com/',
        'Range: bytes=0-', // Important for video CDNs
        'Accept: */*'
    ],
    CURLOPT_WRITEFUNCTION  => function($ch, $data) {
        echo $data;
        if (ob_get_level() > 0) ob_flush();
        flush();
        return strlen($data);
    },
]);

curl_exec($ch);
curl_close($ch);

