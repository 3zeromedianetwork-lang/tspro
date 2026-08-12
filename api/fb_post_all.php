<?php
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(['error' => 'No data received']);
    exit;
}

$message = $data['message'] ?? '';
$image_base64 = $data['image'] ?? '';
$hashtags = $data['hashtags'] ?? '';

if (!empty($hashtags)) {
    $message .= "\n\n" . $hashtags;
}

if (empty($image_base64)) {
    echo json_encode(['error' => 'No card image received']);
    exit;
}

// User Access Token that has access to all pages
$user_access_token = 'EAAUo94vzrAMBSPEvXWEHaSHzizyMBnwn3KWSrQQghVBOYRw55Ok8YbaV4Fp24ylawZB2HUzckMI1dY8MoUYXJsazyjYzeqBFz4iEpY9UrVsSNU9bZCpZCvrZBpNeBzSxOeKBJjPoqColjfJnLWxJB6xxLU1P7IuMgeeKVGSyqHFysd9TLls9sRyex6xqBOdH';

// 1. Save base64 image to temporary file
$image_data = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $image_base64));
$temp_file = sys_get_temp_dir() . '/fb_upload_' . time() . '.png';
file_put_contents($temp_file, $image_data);

// 2. Fetch all pages managed by this user
$accounts_url = "https://graph.facebook.com/v20.0/me/accounts?access_token={$user_access_token}&limit=100";
$ch = curl_init($accounts_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$accounts_response = json_decode(curl_exec($ch), true);
curl_close($ch);

if (!isset($accounts_response['data'])) {
    unlink($temp_file);
    echo json_encode(['error' => 'Failed to fetch Facebook Pages', 'details' => $accounts_response]);
    exit;
}

$pages = $accounts_response['data'];
if (count($pages) === 0) {
    unlink($temp_file);
    echo json_encode(['error' => 'No Facebook Pages found for this account']);
    exit;
}

$results = [];

// 3. Loop through pages and post the photo
foreach ($pages as $page) {
    $page_id = $page['id'];
    $page_token = $page['access_token'];
    $page_name = $page['name'];

    $post_url = "https://graph.facebook.com/v20.0/{$page_id}/photos";
    
    $post_data = [
        'message' => $message,
        'access_token' => $page_token,
        'source' => new CURLFile($temp_file, 'image/png', 'news_card.png')
    ];

    $ch = curl_init($post_url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $raw_response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $response = json_decode($raw_response, true);
    
    if ($http_code === 200 && isset($response['id'])) {
        $results[] = [
            'page' => $page_name,
            'status' => 'success',
            'post_id' => $response['id']
        ];
    } else {
        $results[] = [
            'page' => $page_name,
            'status' => 'error',
            'details' => $response
        ];
    }
}

unlink($temp_file);

echo json_encode([
    'success' => true,
    'message' => 'Processed ' . count($pages) . ' pages',
    'results' => $results
]);
