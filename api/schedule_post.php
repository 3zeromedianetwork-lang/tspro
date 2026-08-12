<?php
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(['error' => 'No data received']);
    exit;
}

$message = $data['message'] ?? '';
$media_type = $data['media_type'] ?? 'image';
$media_data = $data['media_data'] ?? ''; // base64 or video path
// Fallback for older image requests
if (empty($media_data) && isset($data['image'])) {
    $media_data = $data['image'];
}
$hashtags = $data['hashtags'] ?? '';
$page_id = $data['page_id'] ?? '';
$page_token = $data['page_token'] ?? '';
$page_name = $data['page_name'] ?? '';
$schedule_time = $data['schedule_time'] ?? '';

if (empty($page_id) || empty($page_token)) {
    echo json_encode(['error' => 'Page ID or Token missing']);
    exit;
}

if (empty($media_data)) {
    echo json_encode(['error' => 'Media data missing']);
    exit;
}

if (!empty($hashtags)) {
    $message .= "\n\n" . $hashtags;
}

$scheduled_posts_file = __DIR__ . '/scheduled_posts.json';
$posts = [];
if (file_exists($scheduled_posts_file)) {
    $posts = json_decode(file_get_contents($scheduled_posts_file), true) ?: [];
}

$posts[] = [
    'id' => uniqid('post_'),
    'page_id' => $page_id,
    'page_token' => $page_token,
    'page_name' => $page_name,
    'message' => $message,
    'media_type' => $media_type,
    'media_data' => $media_data,
    'schedule_time' => $schedule_time,
    'created_at' => date('c')
];

$json = json_encode($posts, JSON_PRETTY_PRINT);
$result = file_put_contents($scheduled_posts_file, $json);

if ($result === false) {
    echo json_encode(['error' => 'Failed to save post to queue file. Check folder permissions.']);
    exit;
}

echo json_encode(['success' => true, 'message' => "Post scheduled for $schedule_time on $page_name"]);
