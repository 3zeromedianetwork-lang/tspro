<?php
require_once 'video_config.php';
setCORSHeaders();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Invalid request method']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['videoUrl']) || !isset($input['overlayData'])) {
    echo json_encode(['success' => false, 'error' => 'Missing videoUrl or overlayData']);
    exit;
}

$videoUrl = $input['videoUrl'];
$overlayData = $input['overlayData'];

$trimStart = isset($input['trimStart']) ? floatval($input['trimStart']) : 0;
$trimEnd = isset($input['trimEnd']) ? floatval($input['trimEnd']) : 0;
$muteVideo = isset($input['muteVideo']) ? $input['muteVideo'] : false;
$musicUrl = isset($input['musicUrl']) ? $input['musicUrl'] : null;
$bgUrl = isset($input['bgUrl']) ? $input['bgUrl'] : null;
$videoBox = isset($input['videoBox']) ? $input['videoBox'] : ['x' => 0, 'y' => 0, 'w' => 1, 'h' => 1];

// Map URLs to local file paths
$videoFilename = basename($videoUrl);
$videoFile = TEMP_DIR . $videoFilename;

if (!file_exists($videoFile)) {
    echo json_encode(['success' => false, 'error' => 'Base video file not found on server']);
    exit;
}

$projectId = uniqid('vproj_');
$overlayFile = TEMP_DIR . $projectId . '_overlay.png';
$outputFile = TEMP_DIR . $projectId . '_final.mp4';

// Remove base64 header and save overlay PNG (Text & Logos)
$overlayData = preg_replace('#^data:image/\w+;base64,#i', '', $overlayData);
file_put_contents($overlayFile, base64_decode($overlayData));

// Target Dimensions (from the transparent overlay PNG, which captures the canvas aspect ratio natively)
list($targetW, $targetH) = getimagesize($overlayFile);
$targetW = $targetW % 2 === 0 ? $targetW : $targetW + 1;
$targetH = $targetH % 2 === 0 ? $targetH : $targetH + 1;

// Calculate actual pixels for the dragged video
$vidX = round($videoBox['x'] * $targetW);
$vidY = round($videoBox['y'] * $targetH);
$vidW = round($videoBox['w'] * $targetW);
$vidH = round($videoBox['h'] * $targetH);
// Ensure even dimensions
$vidW = $vidW % 2 === 0 ? $vidW : $vidW + 1;
$vidH = $vidH % 2 === 0 ? $vidH : $vidH + 1;

// Ensure FFmpeg is available
$ffmpegPath = dirname(__DIR__) . '/bin/ffmpeg.exe';
if (!file_exists($ffmpegPath)) {
    $ffmpegPath = 'ffmpeg'; 
}

// Build FFmpeg command inputs
$cmd = "\"$ffmpegPath\" -y";

$inputIndex = 0;

// 0: Base Video (Apply trim if provided)
if ($trimStart > 0) $cmd .= " -ss {$trimStart}";
if ($trimEnd > 0 && $trimEnd > $trimStart) {
    $duration = $trimEnd - $trimStart;
    $cmd .= " -t {$duration}";
}
$cmd .= " -i \"$videoFile\"";
$videoInputIndex = $inputIndex++;

// 1: Transparent Overlay PNG (Text/Logos)
$cmd .= " -i \"$overlayFile\"";
$overlayInputIndex = $inputIndex++;

// 2: Background Template Image (Optional)
$bgInputIndex = -1;
if ($bgUrl) {
    $bgFile = TEMP_DIR . basename($bgUrl);
    if (file_exists($bgFile)) {
        $cmd .= " -i \"$bgFile\"";
        $bgInputIndex = $inputIndex++;
    }
}

// 3: Background Music (Optional)
$musicInputIndex = -1;
if ($musicUrl) {
    $musicFile = TEMP_DIR . basename($musicUrl);
    if (file_exists($musicFile)) {
        $cmd .= " -stream_loop -1 -i \"$musicFile\"";
        $musicInputIndex = $inputIndex++;
    }
}

// Build complex filter for visual compositing
$filter = "";

// 1. Prepare Background (either uploaded image or solid black)
if ($bgInputIndex !== -1) {
    $filter .= "[{$bgInputIndex}:v]scale={$targetW}:{$targetH}:force_original_aspect_ratio=increase,crop={$targetW}:{$targetH}[bg];";
} else {
    // Generate solid black background
    $filter .= "color=c=black:s={$targetW}x{$targetH}[bg];";
}

// 2. Prepare Video (Scale to dragged size)
$filter .= "[{$videoInputIndex}:v]scale={$vidW}:{$vidH}:force_original_aspect_ratio=increase,crop={$vidW}:{$vidH}[vid_scaled];";

// 3. Overlay Video onto Background
$filter .= "[bg][vid_scaled]overlay={$vidX}:{$vidY}[bg_with_video];";

// 4. Overlay Text/Logos PNG on top of everything
$filter .= "[bg_with_video][{$overlayInputIndex}:v]overlay=0:0[vout]";

// Build Audio Filter
$audioFilter = "";
$mapAudio = "";
if ($musicInputIndex !== -1) {
    if ($muteVideo) {
        // Just use music
        $audioFilter = "[{$musicInputIndex}:a]afade=t=in:st=0:d=1[aout]";
    } else {
        // Mix original and music
        $audioFilter = "[{$videoInputIndex}:a][{$musicInputIndex}:a]amix=inputs=2:duration=shortest[aout]";
    }
    $mapAudio = "-map \"[aout]\"";
} else {
    if (!$muteVideo) {
        // Just use original audio
        $mapAudio = "-map {$videoInputIndex}:a?";
    }
}

// Finalize command
$cmd .= " -filter_complex \"{$filter}" . ($audioFilter ? ";" . $audioFilter : "") . "\" -map \"[vout]\" {$mapAudio}";
$cmd .= " -c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p " . ($mapAudio ? "-c:a aac -b:a 128k -shortest" : "") . " -movflags +faststart \"$outputFile\" 2>&1";

$output = [];
$return_var = 0;
exec($cmd, $output, $return_var);

if ($return_var !== 0) {
    echo json_encode([
        'success' => false, 
        'error' => 'FFmpeg processing failed',
        'log' => implode("\n", $output)
    ]);
    exit;
}

// Return the URL to the final video
$finalUrl = str_replace(dirname(__DIR__), '', $outputFile);
$finalUrl = str_replace('\\', '/', $finalUrl);
if ($finalUrl[0] !== '/') $finalUrl = '/' . $finalUrl;
$finalUrl = '.' . $finalUrl;

echo json_encode([
    'success' => true,
    'url' => $finalUrl
]);
?>
