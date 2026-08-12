<?php
// Using CURL in proxy for better compatibility with server settings
$url = $_GET['url'] ?? '';

if (!$url) {
    http_response_code(400);
    exit("No URL");
}

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0); // Avoid SSL issues locally
curl_setopt($ch, CURLOPT_TIMEOUT, 20);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

$data = curl_exec($ch);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

if ($data) {
    header("Content-Type: $contentType");
    echo $data;
} else {
    http_response_code(500);
    echo "Failed to fetch image";
}
