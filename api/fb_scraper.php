<?php
/**
 * Facebook Video & Post Scraper API v3
 * Uses browser cookies for authentication to bypass login wall
 * Multi-method: Desktop → Mobile → mbasic fallback
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$url = $input['url'] ?? $_GET['url'] ?? '';
$type = $input['type'] ?? $_GET['type'] ?? 'auto';
$cookies = $input['cookies'] ?? '';

// Cookie file path
$cookieFile = __DIR__ . '/fb_cookies.txt';

// Save cookies if provided
if (!empty($cookies)) {
    file_put_contents($cookieFile, $cookies);
}

if (empty($url)) {
    // If no URL, check if this is a cookie save request
    if (!empty($cookies)) {
        echo json_encode(['success' => true, 'message' => 'Cookies saved successfully']);
        exit;
    }
    echo json_encode(['success' => false, 'error' => 'URL is required']);
    exit;
}

if (!preg_match('/facebook\.com|fb\.watch|fb\.com/i', $url)) {
    echo json_encode(['success' => false, 'error' => 'Please provide a valid Facebook URL']);
    exit;
}

// ==================== HELPER FUNCTIONS ====================

function cleanUrl($url) {
    if (preg_match('/fb\.watch/i', $url)) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_exec($ch);
        $url = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
        curl_close($ch);
    }
    return $url;
}

function fetchWithCurl($url, $mobile = false) {
    global $cookieFile;
    
    $ch = curl_init();
    
    $ua = $mobile
        ? 'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    
    $opts = [
        CURLOPT_URL            => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 10,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_USERAGENT      => $ua,
        CURLOPT_HTTPHEADER     => [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language: en-US,en;q=0.5',
            'Cache-Control: no-cache',
        ],
        CURLOPT_ENCODING       => '',
    ];
    
    // Use cookie file if it exists
    if (file_exists($cookieFile) && filesize($cookieFile) > 10) {
        $opts[CURLOPT_COOKIEFILE] = $cookieFile;
        $opts[CURLOPT_COOKIEJAR] = $cookieFile;
    }
    
    curl_setopt_array($ch, $opts);
    
    $html = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    
    if ($err) return ['error' => $err, 'html' => null];
    if ($code !== 200) return ['error' => "HTTP $code", 'html' => null];
    return ['error' => null, 'html' => $html];
}

function isLoginPage($html) {
    return (stripos($html, 'Log in to Facebook') !== false || 
            stripos($html, 'login_form') !== false ||
            (stripos($html, 'login') !== false && stripos($html, 'password') !== false && strlen($html) < 50000));
}

function unicode_decode($str) {
    return preg_replace_callback('/\\\\u([0-9a-fA-F]{4})/', function ($m) {
        return mb_convert_encoding(pack('H*', $m[1]), 'UTF-8', 'UCS-2BE');
    }, $str);
}

function decodeText($str) {
    if (empty($str)) return $str;
    $str = unicode_decode($str);
    $str = html_entity_decode($str, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $str = stripslashes($str);
    return trim($str);
}

function cleanVideoUrl($url) {
    if (empty($url)) return null;
    $url = unicode_decode($url);
    $url = stripslashes($url);
    $url = str_replace('\\/', '/', $url);
    $url = html_entity_decode($url, ENT_QUOTES, 'UTF-8');
    if (strpos($url, 'http') !== 0) return null;
    return $url;
}

function toMobileUrl($url) {
    $url = preg_replace('/www\.facebook\.com/i', 'mbasic.facebook.com', $url);
    $url = preg_replace('/m\.facebook\.com/i', 'mbasic.facebook.com', $url);
    $url = preg_replace('/web\.facebook\.com/i', 'mbasic.facebook.com', $url);
    return $url;
}

function toMUrl($url) {
    $url = preg_replace('/www\.facebook\.com/i', 'm.facebook.com', $url);
    $url = preg_replace('/mbasic\.facebook\.com/i', 'm.facebook.com', $url);
    $url = preg_replace('/web\.facebook\.com/i', 'm.facebook.com', $url);
    return $url;
}

function toWwwUrl($url) {
    $url = preg_replace('/mbasic\.facebook\.com/i', 'www.facebook.com', $url);
    $url = preg_replace('/m\.facebook\.com/i', 'www.facebook.com', $url);
    $url = preg_replace('/web\.facebook\.com/i', 'www.facebook.com', $url);
    return $url;
}

function detectType($url) {
    if (preg_match('/\/videos\/|\/watch[\/?]|\/reel\/|fb\.watch/i', $url)) return 'video';
    if (preg_match('/\/posts\/|\/permalink\/|\/photo/i', $url)) return 'post';
    return 'auto';
}

// ==================== VIDEO EXTRACTION ====================

function extractVideoUrls($html) {
    $hd = null;
    $sd = null;
    
    // --- Method 1: The "fdown" style - Looking for hd_src and sd_src ---
    // Professional sites often look for these specific keys in the source
    $patterns = [
        'hd' => [
            '/hd_src\s*:\s*"([^"]+)"/i',
            '/"hd_src"\s*:\s*"([^"]+)"/i',
            '/hd_src_no_ratelimit\s*[":]\s*"(https?[^"]+)"/i',
            '/"playable_url_quality_hd"\s*:\s*"([^"]+)"/i',
            '/playable_url_quality_hd\s*[":]\s*"(https?[^"]+)"/i',
        ],
        'sd' => [
            '/sd_src\s*:\s*"([^"]+)"/i',
            '/"sd_src"\s*:\s*"([^"]+)"/i',
            '/sd_src_no_ratelimit\s*[":]\s*"(https?[^"]+)"/i',
            '/"playable_url"\s*:\s*"([^"]+)"/i',
            '/playable_url\s*[":]\s*"(https?[^"]+)"/i',
        ]
    ];
    
    foreach ($patterns['hd'] as $p) {
        if (preg_match($p, $html, $m)) {
            $hd = cleanVideoUrl($m[1]);
            if ($hd) break;
        }
    }
    
    foreach ($patterns['sd'] as $p) {
        if (preg_match($p, $html, $m)) {
            $sd = cleanVideoUrl($m[1]);
            if ($sd) break;
        }
    }

    // --- Method 2: Modern FB JSON patterns (Relay/Comet) ---
    if (!$sd && !$hd) {
        // Sometimes URLs are double-escaped or inside JSON blobs
        $hd_json = [
            '/browser_native_hd_url\s*[":]\s*"(https?[^"]+)"/i',
            '/browser_native_hd_url\\\?"\s*:\s*\\\?"(https?[^"\\\\]+)/i',
        ];
        $sd_json = [
            '/browser_native_sd_url\s*[":]\s*"(https?[^"]+)"/i',
            '/browser_native_sd_url\\\?"\s*:\s*\\\?"(https?[^"\\\\]+)/i',
        ];
        
        foreach ($hd_json as $p) {
            if (preg_match($p, $html, $m)) { $hd = cleanVideoUrl($m[1]); if ($hd) break; }
        }
        foreach ($sd_json as $p) {
            if (preg_match($p, $html, $m)) { $sd = cleanVideoUrl($m[1]); if ($sd) break; }
        }
    }
    
    // --- Method 3: og:video meta tags (Standard) ---
    if (!$sd && !$hd) {
        if (preg_match('/<meta\s+property="og:video(?::url)?"\s+content="([^"]+)"/i', $html, $m)) {
            $v = decodeText($m[1]);
            if (strpos($v, '.mp4') !== false || strpos($v, 'video') !== false) $sd = $v;
        }
    }
    
    return ['hd' => $hd, 'sd' => $sd];
}

/**
 * Trick used by fdown: Try to fetch the embed version of the video
 * This often provides cleaner source code with direct links.
 */
function fetchEmbedSource($url) {
    // Extract video ID
    $video_id = null;
    if (preg_match('/(?:\/videos\/|v=|watch\?v=|v\/|reel\/|fb\.watch\/)([0-9a-zA-Z]+)/', $url, $m)) {
        $video_id = $m[1];
    }
    
    if (!$video_id) return null;
    
    $embed_url = "https://www.facebook.com/video/embed?video_id=" . $video_id;
    return fetchWithCurl($embed_url, false)['html'] ?? null;
}

function extractMbasicVideoUrl($html) {
    $urls = [];
    if (preg_match_all('/href="([^"]*(?:video_redirect|\.mp4)[^"]*)"/i', $html, $matches)) {
        foreach ($matches[1] as $u) {
            $u = decodeText($u);
            if (preg_match('/src=([^&"]+)/i', $u, $s)) $urls[] = urldecode($s[1]);
            else $urls[] = $u;
        }
    }
    if (preg_match('/<video[^>]+src="([^"]+)"/i', $html, $m)) $urls[] = decodeText($m[1]);
    if (preg_match_all('/(https?:\/\/[^\s"\'<>]*?video[^\s"\'<>]*?\.mp4[^\s"\'<>]*)/i', $html, $matches))
        $urls = array_merge($urls, $matches[1]);
    return $urls;
}

// ==================== POST EXTRACTION ====================

function extractPostData($html) {
    $result = ['text' => null, 'images' => [], 'author' => null, 'timestamp' => null, 'title' => null];
    
    // Title / Author
    if (preg_match('/<meta\s+property="og:title"\s+content="([^"]+)"/i', $html, $m)) {
        $result['title'] = decodeText($m[1]);
        $result['author'] = $result['title'];
    }
    if (!$result['title'] && preg_match('/<title>([^<]+)<\/title>/i', $html, $m)) {
        $title = decodeText($m[1]);
        // Remove "Log in" etc
        if (stripos($title, 'log in') === false) $result['title'] = $title;
    }
    
    // Text: og:description
    if (preg_match('/<meta\s+property="og:description"\s+content="([^"]+)"/i', $html, $m)) {
        $t = decodeText($m[1]);
        if (strlen($t) > 5) $result['text'] = $t;
    }
    
    // Text: JSON patterns (modern FB embeds data in JS)
    $textPatterns = [
        '/"message"\s*:\s*\{\s*"text"\s*:\s*"((?:[^"\\\\]|\\\\.)*)"/s',
        '/"story"\s*:\s*\{.*?"message"\s*:\s*\{\s*"text"\s*:\s*"((?:[^"\\\\]|\\\\.)*)"/s',
        '/"description"\s*:\s*\{\s*"text"\s*:\s*"((?:[^"\\\\]|\\\\.)*)"/s',
        '/"text"\s*:\s*"((?:[^"\\\\]|\\\\.){30,})"/s',
    ];
    
    foreach ($textPatterns as $p) {
        if (!$result['text'] || strlen($result['text']) < 20) {
            if (preg_match_all($p, $html, $matches)) {
                foreach ($matches[1] as $txt) {
                    $d = decodeText($txt);
                    if (strlen($d) > strlen($result['text'] ?? '') && !preg_match('/^https?:\/\//i', $d)) {
                        $result['text'] = $d;
                    }
                }
            }
        }
    }
    
    // Text: meta description
    if ((!$result['text'] || strlen($result['text']) < 10) && preg_match('/<meta\s+name="description"\s+content="([^"]+)"/i', $html, $m)) {
        $result['text'] = decodeText($m[1]);
    }
    
    // Images
    if (preg_match_all('/<meta\s+property="og:image"\s+content="([^"]+)"/i', $html, $ms)) {
        foreach ($ms[1] as $img) {
            $d = decodeText($img);
            if (!in_array($d, $result['images'])) $result['images'][] = $d;
        }
    }
    if (preg_match_all('/"uri"\s*:\s*"(https?[^"]*?(?:jpg|jpeg|png|webp)[^"]*)"/i', $html, $ms)) {
        foreach ($ms[1] as $img) {
            $d = cleanVideoUrl($img);
            if ($d && !in_array($d, $result['images']) && strpos($d, 'emoji') === false) $result['images'][] = $d;
        }
    }
    
    return $result;
}

function extractMbasicPostData($html) {
    $result = ['text' => null, 'images' => [], 'author' => null, 'timestamp' => null, 'title' => null];
    
    if (preg_match('/<title>([^<]+)<\/title>/i', $html, $m)) {
        $title = decodeText($m[1]);
        if (stripos($title, 'log in') === false) {
            $result['title'] = $title;
            $result['author'] = $title;
        }
    }
    
    // Post text from mbasic divs
    $patterns = [
        '/class="[^"]*story_body_container[^"]*"[^>]*>(.*?)<\/div>/si',
        '/data-ft[^>]*>(.*?)<\/div>/si',
        '/<p>(.*?)<\/p>/si',
        '/class="[^"]*_5pbx[^"]*"[^>]*>(.*?)<\/div>/si',
    ];
    
    foreach ($patterns as $p) {
        if (preg_match_all($p, $html, $ms)) {
            foreach ($ms[1] as $raw) {
                $t = trim(strip_tags($raw));
                $t = preg_replace('/\s+/', ' ', $t);
                if (strlen($t) > strlen($result['text'] ?? '') && strlen($t) > 10) $result['text'] = $t;
            }
        }
    }
    
    // Article content
    if (!$result['text'] || strlen($result['text']) < 20) {
        if (preg_match('/<article[^>]*>(.*?)<\/article>/si', $html, $m)) {
            $t = trim(preg_replace('/\s+/', ' ', strip_tags($m[1])));
            if (strlen($t) > strlen($result['text'] ?? '')) $result['text'] = $t;
        }
    }
    
    // Images
    if (preg_match_all('/<img[^>]+src="(https?:\/\/[^"]+)"/i', $html, $ms)) {
        foreach ($ms[1] as $img) {
            $d = decodeText($img);
            if (strpos($d, 'emoji') === false && strpos($d, 'rsrc.php') === false && 
                strpos($d, 'static') === false && !in_array($d, $result['images']))
                $result['images'][] = $d;
        }
    }
    
    return $result;
}

// ==================== MAIN EXECUTION ====================

$url = cleanUrl($url);
// Normalize to www
$url = toWwwUrl($url);
$detectedType = ($type === 'auto') ? detectType($url) : $type;

$response = [
    'success'    => true,
    'type'       => $detectedType,
    'url'        => $url,
    'debug'      => [],
    'needCookies' => false,
];

$desktopHtml = '';
$hasCookies = file_exists($cookieFile) && filesize($cookieFile) > 10;
$response['debug'][] = $hasCookies ? 'Cookies loaded ✓' : 'No cookies (limited access)';

// Fetch desktop version
$response['debug'][] = 'Fetching desktop page...';
$page = fetchWithCurl($url, false);
$desktopHtml = $page['html'] ?? '';

// Check if login wall
if (!empty($desktopHtml) && isLoginPage($desktopHtml)) {
    $response['debug'][] = 'Login wall detected!';
    if (!$hasCookies) {
        $response['needCookies'] = true;
        $response['debug'][] = 'Please add your FB cookies to continue';
    }
}

// === VIDEO ===
if ($detectedType === 'video' || $detectedType === 'auto') {
    $videoResult = ['hd_url' => null, 'sd_url' => null, 'title' => null, 'description' => null, 'thumbnail' => null];
    
    if (!empty($desktopHtml)) {
        $vids = extractVideoUrls($desktopHtml);
        $videoResult['hd_url'] = $vids['hd'];
        $videoResult['sd_url'] = $vids['sd'];
        
        if (preg_match('/<meta\s+property="og:title"\s+content="([^"]+)"/i', $desktopHtml, $m))
            $videoResult['title'] = decodeText($m[1]);
        if (preg_match('/<meta\s+property="og:description"\s+content="([^"]+)"/i', $desktopHtml, $m))
            $videoResult['description'] = decodeText($m[1]);
        if (preg_match('/<meta\s+property="og:image"\s+content="([^"]+)"/i', $desktopHtml, $m))
            $videoResult['thumbnail'] = decodeText($m[1]);
    }
    
    // Fallback: embed trick (fdown style)
    if (!$videoResult['hd_url'] && !$videoResult['sd_url']) {
        $response['debug'][] = 'Desktop failed, trying embed trick...';
        $embedHtml = fetchEmbedSource($url);
        if ($embedHtml) {
            $vids = extractVideoUrls($embedHtml);
            $videoResult['hd_url'] = $vids['hd'];
            $videoResult['sd_url'] = $vids['sd'];
        }
    }
    
    // Fallback: mobile
    if (!$videoResult['hd_url'] && !$videoResult['sd_url']) {
        $response['debug'][] = 'Embed failed, trying m.facebook.com...';
        $page = fetchWithCurl(toMUrl($url), true);
        $mHtml = $page['html'] ?? '';
        if (!empty($mHtml)) {
            $vids = extractVideoUrls($mHtml);
            $videoResult['hd_url'] = $vids['hd'];
            $videoResult['sd_url'] = $vids['sd'];
            if (!$videoResult['sd_url']) {
                $mUrls = extractMbasicVideoUrl($mHtml);
                if (!empty($mUrls)) $videoResult['sd_url'] = $mUrls[0];
            }
        }
    }
    
    // Fallback: mbasic
    if (!$videoResult['hd_url'] && !$videoResult['sd_url']) {
        $response['debug'][] = 'Trying mbasic.facebook.com...';
        $page = fetchWithCurl(toMobileUrl($url), true);
        $mbHtml = $page['html'] ?? '';
        if (!empty($mbHtml)) {
            $mUrls = extractMbasicVideoUrl($mbHtml);
            if (!empty($mUrls)) $videoResult['sd_url'] = cleanVideoUrl($mUrls[0]);
            if (!$videoResult['sd_url']) {
                $vids = extractVideoUrls($mbHtml);
                $videoResult['hd_url'] = $vids['hd'];
                $videoResult['sd_url'] = $vids['sd'];
            }
        }
    }
    
    $response['video'] = $videoResult;
    $response['debug'][] = ($videoResult['hd_url'] || $videoResult['sd_url']) ? 'Video found!' : 'No video found';
    
    if (!$videoResult['hd_url'] && !$videoResult['sd_url'] && $detectedType === 'auto') {
        $detectedType = 'post';
        $response['type'] = 'post';
    }
}

// === POST ===
if ($detectedType === 'post' || $detectedType === 'auto') {
    if (empty($desktopHtml)) {
        $page = fetchWithCurl($url, false);
        $desktopHtml = $page['html'] ?? '';
    }
    
    $postData = extractPostData($desktopHtml);
    
    // Fallback to mbasic for better post text
    if (!$postData['text'] || strlen($postData['text']) < 20) {
        $response['debug'][] = 'Trying mbasic for post content...';
        $page = fetchWithCurl(toMobileUrl($url), true);
        $mbHtml = $page['html'] ?? '';
        if (!empty($mbHtml)) {
            $mbPost = extractMbasicPostData($mbHtml);
            if ($mbPost['text'] && strlen($mbPost['text']) > strlen($postData['text'] ?? ''))
                $postData['text'] = $mbPost['text'];
            if (!$postData['author'] && $mbPost['author']) $postData['author'] = $mbPost['author'];
            if (!$postData['title'] && $mbPost['title']) $postData['title'] = $mbPost['title'];
            foreach ($mbPost['images'] as $img) {
                if (!in_array($img, $postData['images'])) $postData['images'][] = $img;
            }
        }
    }
    
    $response['post'] = $postData;
    $response['debug'][] = $postData['text'] ? ('Post text: ' . strlen($postData['text']) . ' chars') : 'No post text';
}

// === METADATA ===
$response['meta'] = ['title' => null, 'description' => null, 'image' => null, 'site_name' => null];
if (preg_match('/<meta\s+property="og:title"\s+content="([^"]+)"/i', $desktopHtml, $m))
    $response['meta']['title'] = decodeText($m[1]);
if (preg_match('/<meta\s+property="og:description"\s+content="([^"]+)"/i', $desktopHtml, $m))
    $response['meta']['description'] = decodeText($m[1]);
if (preg_match('/<meta\s+property="og:image"\s+content="([^"]+)"/i', $desktopHtml, $m))
    $response['meta']['image'] = decodeText($m[1]);
if (preg_match('/<meta\s+property="og:site_name"\s+content="([^"]+)"/i', $desktopHtml, $m))
    $response['meta']['site_name'] = decodeText($m[1]);

echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
