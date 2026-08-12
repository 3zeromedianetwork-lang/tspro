<?php
header('Content-Type: application/json');

$url = $_GET['url'] ?? '';
$minutesLimit = isset($_GET['minutes']) ? intval($_GET['minutes']) : 30;

if (!$url) {
    echo json_encode(['error' => 'No URL provided']);
    exit;
}

// Ensure the URL ends with /feed for WordPress sites
$rssUrl = rtrim($url, '/') . '/feed';

function fetch_rss($url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
    
    $content = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http_code !== 200) return null;
    return $content;
}

$xmlContent = fetch_rss($rssUrl);
if (!$xmlContent) {
    // Try original URL if /feed failed
    $xmlContent = fetch_rss($url);
}

if (!$xmlContent) {
    echo json_encode(['error' => 'Could not fetch RSS feed']);
    exit;
}

try {
    $xml = new SimpleXMLElement($xmlContent);
    $items = [];
    $now = time();
    $limitSeconds = $minutesLimit * 60;

    foreach ($xml->channel->item as $item) {
        $pubDate = strtotime((string)$item->pubDate);
        $diff = $now - $pubDate;

        if ($diff <= $limitSeconds) {
            $items[] = [
                'title' => (string)$item->title,
                'link' => (string)$item->link,
                'pubDate' => (string)$item->pubDate,
                'timestamp' => $pubDate
            ];
        }
    }

    echo json_encode(['success' => true, 'count' => count($items), 'items' => $items]);
} catch (Exception $e) {
    echo json_encode(['error' => 'Failed to parse RSS: ' . $e->getMessage()]);
}
