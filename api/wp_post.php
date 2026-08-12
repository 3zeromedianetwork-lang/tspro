<?php
require_once 'wp_config.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(['error' => 'No data received']);
    exit;
}

$title = $data['title'] ?? 'News Update';
$content = $data['content'] ?? '';
$image_base64 = $data['image'] ?? '';
$category_id = $data['category'] ?? null;
$tags_input = $data['tags'] ?? '';

if (empty($image_base64)) {
    echo json_encode(['error' => 'No card image received']);
    exit;
}

// 1. Upload Image to WordPress Media
$image_data = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $image_base64));
$filename = 'news_card_' . time() . '.png';

$wp_api_url = rtrim(WP_URL, '/') . '/wp-json/wp/v2';
$auth = base64_encode(WP_USER . ':' . WP_APP_PASSWORD);

// Upload Media
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $wp_api_url . '/media');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Basic ' . $auth,
    'Content-Disposition: attachment; filename="' . $filename . '"',
    'Content-Type: image/png'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, $image_data);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$raw_media_response = curl_exec($ch);
$media_http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
$media_response = json_decode($raw_media_response, true);
curl_close($ch);

if ($media_http_code !== 201) {
    echo json_encode([
        'error' => 'Failed to upload image to WordPress', 
        'code' => $media_http_code,
        'curl_error' => $curl_error,
        'details' => $media_response ?: $raw_media_response
    ]);
    exit;
}

$media_id = $media_response['id'] ?? null;

// 2. Create Post
$post_data = [
    'title' => $title,
    'content' => $content,
    'status' => 'publish', 
    'featured_media' => $media_id
];

if (!empty($category_id)) {
    $post_data['categories'] = [(int)$category_id];
}

if (!empty($tags_input)) {
    // Handling tags as names (WP REST API usually needs IDs, 
    // but some setups allow names or we can just send as strings)
    // For now, we'll send it and WP will handle if it can.
    $post_data['tags_input'] = $tags_input; 
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $wp_api_url . '/posts');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Basic ' . $auth,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($post_data));
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$raw_post_response = curl_exec($ch);
$post_http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$post_response = json_decode($raw_post_response, true);
curl_close($ch);

if ($post_http_code === 201 && isset($post_response['id'])) {
    echo json_encode([
        'success' => true, 
        'post_id' => $post_response['id'], 
        'link' => $post_response['link']
    ]);
} else {
    echo json_encode([
        'error' => 'Failed to create post', 
        'code' => $post_http_code,
        'details' => $post_response ?: $raw_post_response
    ]);
}
