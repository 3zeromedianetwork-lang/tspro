<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

if (!extension_loaded('curl')) {
    http_response_code(500);
    echo json_encode(['error' => 'PHP Curl extension is NOT enabled on this hosting. Please contact support or enable it in cPanel.']);
    exit;
}

if (!class_exists('DOMDocument')) {
    echo json_encode(['error' => 'PHP DOM extension is not enabled in XAMPP. Please enable it in php.ini.']);
    exit;
}

$url = $_GET['url'] ?? '';

$url = trim($url);
if (!preg_match('/^https?:\/\//i', $url)) {
    $url = 'https://' . $url;
}

if (!$url || !filter_var($url, FILTER_VALIDATE_URL)) {
    echo json_encode(['error' => 'Invalid URL']);
    exit;
}

function fetch_content($url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_ENCODING, ""); // Auto-detect and decode supported encodings
    curl_setopt($ch, CURLOPT_AUTOREFERER, true);
    curl_setopt($ch, CURLOPT_MAXREDIRS, 10);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
    
    // Mimicking a Mobile Chrome version on Android
    $user_agent = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36';
    curl_setopt($ch, CURLOPT_USERAGENT, $user_agent);
    
    $headers = [
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language: en-US,en;q=0.9,ta;q=0.8',
        'Cache-Control: max-age=0',
        'Referer: https://www.google.com/',
        'Sec-Ch-Ua: "Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
        'Sec-Ch-Ua-Mobile: ?1',
        'Sec-Ch-Ua-Platform: "Android"',
        'Sec-Fetch-Dest: document',
        'Sec-Fetch-Mode: navigate',
        'Sec-Fetch-Site: cross-site',
        'Sec-Fetch-User: ?1',
        'Upgrade-Insecure-Requests: 1'
    ];
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    // Some sites block without a cookie, but we don't have one initially.
    // We can use a cookie file to persist sessions if needed.
    // curl_setopt($ch, CURLOPT_COOKIEJAR, 'cookie.txt');
    // curl_setopt($ch, CURLOPT_COOKIEFILE, 'cookie.txt');

    $content = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);
    
    // If blocked (403), try Proxy Fallbacks
    if ($http_code === 403 || $http_code === 401 || $http_code === 404 || strlen($content) < 2000) {
        $proxies = [
            "https://r.jina.ai/", // Jina AI Reader - Excellent for Cloudflare bypass
            "https://api.codetabs.com/v1/proxy?quest=",
            "https://api.allorigins.win/raw?url="
        ];
        
        foreach ($proxies as $proxy_base) {
            $proxy_url = $proxy_base . urlencode($url);
            $ch2 = curl_init($proxy_url);
            curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch2, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch2, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch2, CURLOPT_TIMEOUT, 20);
            curl_setopt($ch2, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
            $content = curl_exec($ch2);
            $http_code = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
            curl_close($ch2);
            
            if ($http_code === 200 && strlen($content) > 500) {
                return $content;
            }
        }
    }

    if ($curl_error) {
        return ['error' => 'CURL Error: ' . $curl_error];
    }
    if ($http_code !== 200) {
        return ['error' => 'Site returned HTTP ' . $http_code];
    }
    
    return $content;
}

$res = fetch_content($url);

if (is_array($res) && isset($res['error'])) {
    echo json_encode(['error' => 'Could not fetch content: ' . $res['error']]);
    exit;
}

$html = $res;

if (!$html || strlen($html) < 100) {
    echo json_encode(['error' => 'Fetched content is empty or too short. The site might be blocking the server.']);
    exit;
}

libxml_use_internal_errors(true);
$dom = new DOMDocument();
$dom->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'));

$data = [
    'title' => '',
    'content' => '',
    'images' => []
];

// Extract Title
$titleFound = '';
$metas = $dom->getElementsByTagName('meta');

// 1. Try OG Title
foreach ($metas as $meta) {
    if ($meta->getAttribute('property') === 'og:title' || $meta->getAttribute('name') === 'twitter:title') {
        $titleFound = $meta->getAttribute('content');
        break;
    }
}
// 2. Try H1
if (!$titleFound) {
    $h1s = $dom->getElementsByTagName('h1');
    if ($h1s->length > 0) $titleFound = $h1s->item(0)->nodeValue;
}
// 3. Fallback to <title>
if (!$titleFound) {
    $titles = $dom->getElementsByTagName('title');
    if ($titles->length > 0) $titleFound = $titles->item(0)->nodeValue;
}
$data['title'] = trim($titleFound);

// Extract Main Content
$content_parts = [];

// Try to find common article containers first
$selectors = ['article', 'main', '.oi-article-content', '.post-content', '.entry-content', '.article-body', '.content-area', '.story-content'];
$foundContent = false;

// If we find a common container, only take P tags from there
$xpath = new DOMXPath($dom);
foreach ($selectors as $selector) {
    $nodes = [];
    if ($selector[0] === '.') {
        $nodes = $xpath->query("//div[contains(@class, '" . substr($selector, 1) . "')]");
    } else {
        $nodes = $dom->getElementsByTagName($selector);
    }
    
    if ($nodes->length > 0) {
        $p_tags = $nodes->item(0)->getElementsByTagName('p');
        foreach ($p_tags as $p) {
            $text = trim($p->nodeValue);
            if (strlen($text) > 40) $content_parts[] = $text;
        }
        if (count($content_parts) > 2) {
            $foundContent = true;
            break;
        }
    }
}

// Fallback: Just take all P tags from the whole body
if (!$foundContent) {
    $p_tags = $dom->getElementsByTagName('p');
    foreach ($p_tags as $p) {
        $text = trim($p->nodeValue);
        if (strlen($text) > 50) $content_parts[] = $text;
    }
}

$data['content'] = implode("\n\n", array_slice($content_parts, 0, 10)); // Top 10 paragraphs

// Extract Images
$images = [];

// 1. Check OpenGraph Image (Best for featured images)
$metas = $dom->getElementsByTagName('meta');
foreach ($metas as $meta) {
    if ($meta->getAttribute('property') === 'og:image' || $meta->getAttribute('name') === 'twitter:image') {
        $src = $meta->getAttribute('content');
        if ($src) $images[] = $src;
    }
}

// 2. Check all <img> tags
$img_tags = $dom->getElementsByTagName('img');
$base_url = parse_url($url, PHP_URL_SCHEME) . '://' . parse_url($url, PHP_URL_HOST);

foreach ($img_tags as $img) {
    $src = $img->getAttribute('src') ?: $img->getAttribute('data-src') ?: $img->getAttribute('data-lazy-src');
    if ($src) {
        if (strpos($src, 'http') !== 0) {
            if (strpos($src, '/') === 0) {
                $src = $base_url . $src;
            } else {
                $src = dirname($url) . '/' . $src;
            }
        }
        
        // Filter out small icons, tracking pixels, etc.
        $width = $img->getAttribute('width');
        $height = $img->getAttribute('height');
        if (($width && $width < 100) || ($height && $height < 100)) continue;

        if (preg_match('/\.(jpg|jpeg|png|webp)/i', $src) && !strpos($src, 'logo') && !strpos($src, 'icon')) {
            $images[] = $src;
        }
    }
}

$data['images'] = array_values(array_unique($images));

echo json_encode($data);
