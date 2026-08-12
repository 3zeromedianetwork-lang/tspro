<?php
header('Content-Type: application/json');

$test_url = $_GET['url'] ?? 'https://www.google.com';

$results = [
    'php_version' => PHP_VERSION,
    'curl_enabled' => extension_loaded('curl'),
    'dom_enabled' => class_exists('DOMDocument'),
    'test_url' => $test_url,
    'response' => null,
    'error' => null,
    'http_code' => null
];

if ($results['curl_enabled']) {
    $ch = curl_init($test_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $results['response_body_length'] = strlen(curl_exec($ch));
    $results['http_code'] = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $results['error'] = curl_error($ch);
    curl_close($ch);
}

echo json_encode($results);
?>
