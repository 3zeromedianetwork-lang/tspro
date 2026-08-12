<?php
require_once 'wp_config.php';

header('Content-Type: application/json');

$wp_api_url = rtrim(WP_URL, '/') . '/wp-json/wp/v2/categories?per_page=100';
$auth = base64_encode(WP_USER . ':' . WP_APP_PASSWORD);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $wp_api_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Basic ' . $auth
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code === 200) {
    echo $response;
} else {
    echo json_encode(['error' => 'Failed to fetch categories', 'code' => $http_code]);
}
