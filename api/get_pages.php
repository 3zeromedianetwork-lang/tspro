<?php
header('Content-Type: application/json');

$user_access_token = 'EAAUo94vzrAMBSPEvXWEHaSHzizyMBnwn3KWSrQQghVBOYRw55Ok8YbaV4Fp24ylawZB2HUzckMI1dY8MoUYXJsazyjYzeqBFz4iEpY9UrVsSNU9bZCpZCvrZBpNeBzSxOeKBJjPoqColjfJnLWxJB6xxLU1P7IuMgeeKVGSyqHFysd9TLls9sRyex6xqBOdH';
$accounts_url = "https://graph.facebook.com/v20.0/me/accounts?access_token={$user_access_token}&limit=100";

$ch = curl_init($accounts_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$accounts_response = json_decode(curl_exec($ch), true);
curl_close($ch);

if (!isset($accounts_response['data'])) {
    echo json_encode(['error' => 'Failed to fetch Facebook Pages', 'details' => $accounts_response]);
    exit;
}

echo json_encode(['success' => true, 'pages' => $accounts_response['data']]);
