<?php
// Test what Facebook returns for mbasic
$url = 'https://mbasic.facebook.com/oneindiatamil';

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36');
curl_setopt($ch, CURLOPT_ENCODING, '');
curl_setopt($ch, CURLOPT_TIMEOUT, 15);

$html = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
curl_close($ch);

header('Content-Type: text/plain; charset=utf-8');
echo "HTTP Code: $code\n";
echo "Error: $err\n";
echo "HTML Length: " . strlen($html) . "\n";

preg_match('/<title>(.*?)<\/title>/si', $html, $m);
echo "Title: " . ($m[1] ?? 'none') . "\n";
echo "Has 'login': " . (stripos($html, 'login') !== false ? 'YES' : 'NO') . "\n";
echo "Has 'og:description': " . (preg_match('/og:description/', $html) ? 'YES' : 'NO') . "\n";
echo "Has 'story_body': " . (stripos($html, 'story_body') !== false ? 'YES' : 'NO') . "\n";
echo "Has '<p>': " . (stripos($html, '<p>') !== false ? 'YES' : 'NO') . "\n";
echo "Has 'article': " . (stripos($html, '<article') !== false ? 'YES' : 'NO') . "\n\n";
echo "=== FIRST 5000 CHARS ===\n";
echo substr($html, 0, 5000);
