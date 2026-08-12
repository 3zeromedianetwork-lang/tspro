<?php
// cron_publish.php - This should be run by a cron job every minute
set_time_limit(0); // Prevent PHP from timing out during video upload
header('Content-Type: application/json');

$scheduled_posts_file = __DIR__ . '/scheduled_posts.json';
if (!file_exists($scheduled_posts_file)) {
    echo json_encode(['status' => 'no_posts_file']);
    exit;
}

$posts = json_decode(file_get_contents($scheduled_posts_file), true) ?: [];
if (empty($posts)) {
    echo json_encode(['status' => 'empty_queue']);
    exit;
}

$remaining_posts = $posts; // Keep track of posts that haven't been processed
$published_count = 0;
$errors = [];

$log_file = __DIR__ . '/cron_log.txt';
function log_cron($msg) {
    global $log_file;
    file_put_contents($log_file, date('Y-m-d H:i:s') . " - " . print_r($msg, true) . "\n", FILE_APPEND);
}
log_cron("Cron Started. Remaining posts: " . count($remaining_posts));

$now = time();

foreach ($posts as $index => $post) {
    $schedule_time = strtotime($post['schedule_time']);
    
    // If it's time to publish (or past due)
    if ($now >= $schedule_time) {
        // Remove from remaining queue and save immediately to prevent duplicate publishes if the script crashes/times out
        unset($remaining_posts[$index]);
        file_put_contents($scheduled_posts_file, json_encode(array_values($remaining_posts), JSON_PRETTY_PRINT));

        $media_type = $post['media_type'] ?? 'image';
        
        $post_url = "";
        $post_data = [];
        $temp_file = '';
        
        if ($media_type === 'video') {
            $post_url = "https://graph.facebook.com/v20.0/{$post['page_id']}/videos";
            
            // media_data for video is a relative path like 'temp/filename.mp4' or './temp/filename.mp4'
            // Normalize the path: remove leading ./ if present
            $media_data = ltrim($post['media_data'], './');
            $video_path = dirname(__DIR__) . '/temp/' . basename($media_data);
            $video_path = realpath($video_path) ?: $video_path;
            
            if (!file_exists($video_path)) {
                $errors[] = ['post_id' => $post['id'], 'error' => 'Video file not found: ' . $video_path, 'media_data' => $post['media_data'], 'resolved_path' => $video_path];
                continue; // Skip this post
            }

            $post_data = [
                'description' => $post['message'], // Videos use 'description' instead of 'message'
                'access_token' => $post['page_token'],
                'source' => new CURLFile($video_path, 'video/mp4', 'news_video.mp4')
            ];
            
            // Try with file upload first
            $ch = curl_init($post_url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, 300);
            
            $raw_response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curl_error = curl_error($ch);
            curl_close($ch);
            
            if ($curl_error) {
                $errors[] = ['post_id' => $post['id'], 'error' => 'CURL error: ' . $curl_error, 'http_code' => $http_code];
                continue;
            }
            
            $response = json_decode($raw_response, true);
            
            if ($http_code === 200 && isset($response['id'])) {
                $published_count++;
            } elseif ($http_code === 400 && isset($response['error']['code']) && $response['error']['code'] == 3501) {
                $errors[] = ['post_id' => $post['id'], 'error' => 'Video file invalid/corrupted: ' . $response['error']['message'], 'http_code' => $http_code, 'video_path' => $video_path];
            } else {
                $error_msg = is_array($response) && isset($response['error']) ? $response['error']['message'] : $raw_response;
                $errors[] = ['post_id' => $post['id'], 'error' => $error_msg, 'http_code' => $http_code, 'full_response' => $response];
            }
        } else if ($media_type === 'link') {
            log_cron("Processing Link Post for ID: " . $post['id'] . " to page " . $post['page_id']);
            $post_url = "https://graph.facebook.com/v20.0/{$post['page_id']}/feed";
            $post_data = [
                'message' => $post['message'],
                'link' => $post['media_data'], // the URL to share
                'access_token' => $post['page_token']
            ];
            
            $ch = curl_init($post_url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post_data));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, 60);
            
            $raw_response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curl_error = curl_error($ch);
            curl_close($ch);
            
            if ($curl_error) {
                log_cron("CURL Error: $curl_error");
                $errors[] = ['post_id' => $post['id'], 'error' => 'CURL error: ' . $curl_error, 'http_code' => $http_code];
                continue;
            }
            
            $response = json_decode($raw_response, true);
            log_cron("FB API Response for Link: " . $raw_response);
            
            if ($http_code === 200 && isset($response['id'])) {
                log_cron("Link post success: " . $response['id']);
                $published_count++;
            } else {
                $error_msg = is_array($response) && isset($response['error']) ? $response['error']['message'] : $raw_response;
                log_cron("Link post failed: $error_msg");
                $errors[] = ['post_id' => $post['id'], 'error' => $error_msg, 'http_code' => $http_code, 'full_response' => $response];
            }
        } else {
            // Default to image (backward compatibility)
            $post_url = "https://graph.facebook.com/v20.0/{$post['page_id']}/photos";
            
            $temp_file = sys_get_temp_dir() . '/fb_upload_' . uniqid() . '.png';
            $image_data = $post['media_data'] ?? $post['image'] ?? '';
            $image_data = preg_replace('#^data:image/\w+;base64,#i', '', $image_data);
            $image_raw = base64_decode($image_data, true);
            
            if ($image_raw === false) {
                $errors[] = ['post_id' => $post['id'], 'error' => 'Invalid base64 image data', 'http_code' => 400];
                continue;
            }
            
            file_put_contents($temp_file, $image_raw);

            $post_data = [
                'message' => $post['message'],
                'access_token' => $post['page_token'],
                'source' => new CURLFile($temp_file, 'image/png', 'news_card.png')
            ];
            
            $ch = curl_init($post_url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, 60);
            
            $raw_response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curl_error = curl_error($ch);
            curl_close($ch);
            
            if ($temp_file && file_exists($temp_file)) {
                unlink($temp_file);
            }
            
            if ($curl_error) {
                $errors[] = ['post_id' => $post['id'], 'error' => 'CURL error: ' . $curl_error, 'http_code' => $http_code];
                continue;
            }
            
            $response = json_decode($raw_response, true);
            
            if ($http_code === 200 && isset($response['id'])) {
                $published_count++;
            } else {
                $error_msg = is_array($response) && isset($response['error']) ? $response['error']['message'] : $raw_response;
                $errors[] = ['post_id' => $post['id'], 'error' => $error_msg, 'http_code' => $http_code, 'full_response' => $response];
            }
        }
    }
}

file_put_contents($scheduled_posts_file, json_encode(array_values($remaining_posts), JSON_PRETTY_PRINT));

echo json_encode([
    'status' => 'completed',
    'published' => $published_count,
    'errors' => $errors
]);

