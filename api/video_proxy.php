<?php
require_once 'video_config.php';
setCORSHeaders();

$url = $_GET['url'] ?? '';

$url = trim($url);
if (!preg_match('/^https?:\/\//i', $url)) {
    $url = 'https://' . $url;
}

if (!$url) {
    http_response_code(400);
    exit('No URL');
}

if (!filter_var($url, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    exit('Invalid URL');
}

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $url,
    CURLOPT_RETURNTRANSFER => false,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_TIMEOUT        => 600,
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    CURLOPT_HTTPHEADER     => [
        'Accept: */*',
        'Referer: https://www.google.com/',
    ],
    CURLOPT_WRITEFUNCTION  => function($ch, $data) {
        echo $data;
        if (ob_get_level() > 0) ob_flush();
        flush();
        return strlen($data);
    },
]);

curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'video/mp4';
$fileSize = curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
curl_close($ch);

if ($httpCode !== 200 && $httpCode !== 206) {
    http_response_code(502);
    echo "Proxy error: HTTP $httpCode";
    exit;
}

header("Content-Type: $contentType");
header('Content-Disposition: attachment; filename="anylink_video.mp4"');
if ($fileSize > 0) {
    header("Content-Length: $fileSize");
}
header('Accept-Ranges: bytes');
header('Cache-Control: no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');