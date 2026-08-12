<?php
set_time_limit(0); // Prevent PHP from timing out during video render
require_once 'video_config.php';
setCORSHeaders();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Invalid request method']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['videoId']) || !isset($input['overlayData'])) {
    echo json_encode(['success' => false, 'error' => 'Missing videoId or overlayData']);
    exit;
}

$videoId = preg_replace('/[^a-zA-Z0-9_-]/', '', $input['videoId']);
$overlayData = $input['overlayData'];
$trimStart = isset($input['trimStart']) ? (float)$input['trimStart'] : 0;
$trimEnd = isset($input['trimEnd']) ? (float)$input['trimEnd'] : null;

$videoFile = TEMP_DIR . $videoId . '.mp4';
if (!file_exists($videoFile)) {
    echo json_encode(['success' => false, 'error' => 'Video file not found']);
    exit;
}

// Ensure FFmpeg is available
$ffmpegPath = dirname(__DIR__) . '/bin/ffmpeg.exe';
if (!file_exists($ffmpegPath)) {
    $ffmpegPath = 'ffmpeg'; 
}

// Verify FFmpeg works
$testCmd = "\"$ffmpegPath\" -version 2>&1";
$testOutput = [];
$testReturn = 0;
exec($testCmd, $testOutput, $testReturn);
if ($testReturn !== 0) {
    echo json_encode([
        'success' => false,
        'error' => 'FFmpeg not found or not working',
        'ffmpeg_path' => $ffmpegPath,
        'test_output' => implode("\n", $testOutput)
    ]);
    exit;
}

$overlayFile = TEMP_DIR . $videoId . '_overlay.png';
$outputFile = TEMP_DIR . $videoId . '_final.mp4';
$logFile = TEMP_DIR . $videoId . '_render.log';

// Check if temp directory is writable
if (!is_writable(TEMP_DIR)) {
    echo json_encode([
        'success' => false,
        'error' => 'Temp directory is not writable: ' . TEMP_DIR,
        'temp_dir' => TEMP_DIR
    ]);
    exit;
}

// Remove base64 header and save overlay PNG
$overlayData = preg_replace('#^data:image/\w+;base64,#i', '', $overlayData);
$overlayBinary = base64_decode($overlayData, true);

if ($overlayBinary === false || strlen($overlayBinary) < 100) {
    echo json_encode([
        'success' => false,
        'error' => 'Invalid or empty overlay image data',
        'base64_length' => strlen($overlayData),
        'decoded_length' => $overlayBinary === false ? 0 : strlen($overlayBinary)
    ]);
    exit;
}

file_put_contents($overlayFile, $overlayBinary);

// Validate PNG file
$imageInfo = @getimagesize($overlayFile);
if ($imageInfo === false || $imageInfo[2] !== IMAGETYPE_PNG) {
    echo json_encode([
        'success' => false,
        'error' => 'Overlay is not a valid PNG file',
        'image_info' => $imageInfo ? $imageInfo : 'getimagesize failed'
    ]);
    exit;
}

// Get overlay dimensions
list($overlayW, $overlayH) = getimagesize($overlayFile);

// Limit resolution for faster rendering
// We DO NOT scale down the video anymore!
// By keeping the original 1080x1350 (or similar) resolution, the logo and date overlay coordinates match perfectly.
// No $maxWidth or $maxHeight scaling.

// FFmpeg libx264 requires width and height to be exactly divisible by 2
$overlayW = $overlayW % 2 === 0 ? $overlayW : $overlayW + 1;
$overlayH = $overlayH % 2 === 0 ? $overlayH : $overlayH + 1;

$boxHeightRatio = isset($input['boxHeightRatio']) ? (float)$input['boxHeightRatio'] : 0.75;

// Convert paths to forward slashes for FFmpeg on Windows
$videoFileFF = str_replace('\\', '/', $videoFile);
$overlayFileFF = str_replace('\\', '/', $overlayFile);
$outputFileFF = str_replace('\\', '/', $outputFile);

$videoTransform = isset($input['videoTransform']) ? $input['videoTransform'] : ['x'=>0, 'y'=>0, 'scaleW'=>1, 'scaleH'=>$boxHeightRatio];
$scaleW = isset($videoTransform['scaleW']) ? (float)$videoTransform['scaleW'] : 1;
$scaleH = isset($videoTransform['scaleH']) ? (float)$videoTransform['scaleH'] : $boxHeightRatio;
$x = isset($videoTransform['x']) ? (float)$videoTransform['x'] : 0;
$y = isset($videoTransform['y']) ? (float)$videoTransform['y'] : 0;

$wrapW = round($overlayW * $scaleW);
$wrapH = round($overlayH * $scaleH);
if ($wrapW % 2 !== 0) $wrapW += 1;
if ($wrapH % 2 !== 0) $wrapH += 1;

$posX = round($overlayW * $x);
$posY = round($overlayH * $y);
if ($posX % 2 !== 0) $posX += 1;
if ($posY % 2 !== 0) $posY += 1;

// ============ SERVER-SIDE TRANSPARENCY ============
// Cut a transparent "window" exactly where the video is located.
$img = imagecreatefrompng($overlayFile);
if ($img) {
    imagesavealpha($img, true);
    imagealphablending($img, false);
    $transparent = imagecolorallocatealpha($img, 0, 0, 0, 127);
    imagefilledrectangle($img, $posX, $posY, $posX + $wrapW - 1, $posY + $wrapH - 1, $transparent);
    imagepng($img, $overlayFile);
    imagedestroy($img);
}
// ===================================================

// Build FFmpeg command
$cmd = "\"$ffmpegPath\" -nostdin -y";
if ($trimStart > 0) {
    $cmd .= " -ss " . $trimStart;
}
if ($trimEnd !== null && $trimEnd > $trimStart) {
    $cmd .= " -to " . $trimEnd;
}

$cmd .= " -i \"$videoFileFF\" -loop 1 -i \"$overlayFileFF\"";

// Scale and crop the video to match the wrapper size
$filter = "[0:v]scale={$wrapW}:{$wrapH}:force_original_aspect_ratio=increase,crop={$wrapW}:{$wrapH}[vid_scaled];";
// Create a full-size black background
$filter .= "color=c=black:s={$overlayW}x{$overlayH}[black_box];";
// Overlay video onto the exact position
$filter .= "[black_box][vid_scaled]overlay=x={$posX}:y={$posY}:shortest=1[vid_boxed];";
// Overlay the template on top of everything
$filter .= "[vid_boxed][1:v]overlay=0:0[bg];";

$hasLogoDate = !empty($input['logoDateData']);

// PRE-VALIDATE LOGO DATE
if ($hasLogoDate) {
    $logoDateDataClean = preg_replace('#^data:image/\w+;base64,#i', '', $input['logoDateData']);
    $logoDateBinary = base64_decode($logoDateDataClean, true);
    if ($logoDateBinary === false || strlen($logoDateBinary) < 100) {
        $hasLogoDate = false;
    } else {
        $logoDateFile = TEMP_DIR . $videoId . '_logodate.png';
        file_put_contents($logoDateFile, $logoDateBinary);
        $logoImageInfo = @getimagesize($logoDateFile);
        if ($logoImageInfo === false || $logoImageInfo[2] !== IMAGETYPE_PNG) {
            $hasLogoDate = false;
            @unlink($logoDateFile);
        }
    }
}

if ($hasLogoDate) {
    $filter .= "[bg][1:v]overlay=0:0:shortest=1[design_with_video]";
} else {
    $filter .= "[bg][1:v]overlay=0:0:shortest=1";
}

$nextInput = 2;

// Add logo/date overlay if provided
if ($hasLogoDate) {
    $logoDateFileFF = str_replace('\\', '/', $logoDateFile);
    $cmd .= " -loop 1 -i \"$logoDateFileFF\"";
    $filter .= ";[design_with_video][{$nextInput}:v]overlay=0:0:shortest=1";
    $nextInput++;
}

$cmd .= " -filter_complex \"$filter\"";

// Output settings. Capture FFmpeg output and write to log manually
$cmd .= " -c:v libx264 -preset ultrafast -crf 23 -tune fastdecode -threads 0 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart \"$outputFileFF\"";

file_put_contents($logFile, "Command: $cmd\n\n", FILE_APPEND);
file_put_contents($logFile, "=== FFmpeg Output ===\n", FILE_APPEND);

$output = [];
$return_var = 0;
$start_time = microtime(true);

$cmd_exec = $cmd . ' 2>&1';
exec($cmd_exec, $output, $return_var);
file_put_contents($logFile, implode("\n", $output) . "\n", FILE_APPEND);

$end_time = microtime(true);
$render_time = round($end_time - $start_time, 2);

file_put_contents($logFile, "\n=== Render Completed in {$render_time} seconds ===\n", FILE_APPEND);
file_put_contents($logFile, "Return code: $return_var\n", FILE_APPEND);

if ($return_var !== 0) {
    echo json_encode([
        'success' => false, 
        'error' => 'FFmpeg processing failed',
        'log' => implode("\n", $output),
        'render_time' => $render_time,
        'log_file' => basename($logFile)
    ]);
    exit;
}

// Verify output file exists
if (!file_exists($outputFile)) {
    echo json_encode([
        'success' => false,
        'error' => 'FFmpeg completed but output file not found',
        'output_file' => $outputFile,
        'render_time' => $render_time,
        'log_file' => basename($logFile)
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
    'url' => $finalUrl,
    'filename' => basename($outputFile),
    'output_file' => $outputFile,
    'render_time' => $render_time,
    'log_file' => basename($logFile)
]);
?>

