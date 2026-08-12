<?php
// Configuration for Video API

// Database credentials for PostgreSQL
define('DB_HOST', 'localhost');
define('DB_PORT', '5432');
define('DB_NAME', 'ai_video_editor');
define('DB_USER', 'postgres');
define('DB_PASS', 'password');

// API Keys
define('OPENAI_API_KEY', 'your_openai_api_key_here');

// Paths
define('UPLOAD_DIR', rtrim(realpath(__DIR__ . '/../uploads/') ?: __DIR__ . '/../uploads/', '/\\') . '/');
define('TEMP_DIR', rtrim(realpath(__DIR__ . '/../temp/') ?: __DIR__ . '/../temp/', '/\\') . '/');
define('OUTPUT_DIR', rtrim(realpath(__DIR__ . '/../output/') ?: __DIR__ . '/../output/', '/\\') . '/');
define('DATA_DIR', rtrim(realpath(__DIR__ . '/../video_data/') ?: __DIR__ . '/../video_data/', '/\\') . '/');

// Executables (Cross-Platform Support for Windows and cPanel/Linux)
if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
    // Windows Localhost (XAMPP) Paths
    define('FFMPEG_PATH', 'ffmpeg');
    define('YTDLP_PATH', __DIR__ . '/../bin/yt-dlp.exe');
    define('NODE_PATH', 'node');
} else {
    // Linux (cPanel) Paths
    // You may need to change these paths depending on your cPanel server setup
    define('FFMPEG_PATH', '/usr/bin/ffmpeg'); // or simply 'ffmpeg' if it's in global PATH
    define('YTDLP_PATH', __DIR__ . '/../bin/yt-dlp'); // Make sure to upload the Linux yt-dlp binary here!
    define('NODE_PATH', '/usr/bin/node'); // or simply 'node'
}

// Constraints
define('MAX_FILE_SIZE', 500 * 1024 * 1024); // 500MB
define('ALLOWED_FORMATS', ['mp4', 'mov', 'avi']);

// CORS Headers
function setCORSHeaders() {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE, PUT");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
        exit(0);
    }
}

// Ensure directories exist
$dirs = [UPLOAD_DIR, TEMP_DIR, OUTPUT_DIR, DATA_DIR];
foreach ($dirs as $dir) {
    if (!file_exists($dir)) {
        mkdir($dir, 0777, true);
    }
}
