<?php
header('Content-Type: application/json');
require_once 'config.php';

$input = json_decode(file_get_contents('php://input'), true);
$text = $input['text'] ?? '';
$tone = $input['tone'] ?? 'powerful';
$type = $input['type'] ?? 'headline';

if (!$text) {
    echo json_encode(['error' => 'No text provided']);
    exit;
}

// System Prompt for Groq
$system_prompt = "You are a professional news editor. Your task is to rewrite news content to match a specific tone while maintaining factual accuracy.";

$lang = $input['lang'] ?? 'English';

$user_prompt = "";
if ($type === 'translate') {
    $user_prompt = "Translate the following news text accurately into $lang. Maintain the original meaning and tone. Return ONLY the translated text.\n\nText: $text";
} elseif ($type === 'hashtags') {
    $user_prompt = "Generate 10 trending and relevant hashtags for Facebook/Instagram based on the following news text. Return ONLY the hashtags separated by spaces, starting with #. Use a mix of English and the original language if applicable.\n\nText: $text";
} elseif ($type === 'headline') {
    $user_prompt = "Based on the following news text, generate a powerful $tone headline. If it's already a headline, rewrite it. If it's content, extract the best headline. Return ONLY the new headline (can be split into 2-3 lines), nothing else.\n\nText: $text";
} else {
    $user_prompt = "Rewrite the following news content to have a $tone tone. Keep the facts accurate but change the style and emotional impact to be $tone. Return ONLY the new content, nothing else.\n\nContent: $text";
}

$api_url = "https://api.groq.com/openai/v1/chat/completions";

$data = [
    "model" => "llama-3.3-70b-versatile",
    "messages" => [
        [
            "role" => "system",
            "content" => $system_prompt
        ],
        [
            "role" => "user",
            "content" => $user_prompt
        ]
    ],
    "temperature" => 0.7,
    "max_tokens" => 1024
];

$ch = curl_init($api_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . GROQ_API_KEY
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 20);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    echo json_encode(['error' => 'Curl error: ' . curl_error($ch)]);
    curl_close($ch);
    exit;
}
curl_close($ch);

if ($http_code !== 200) {
    echo json_encode(['error' => 'Groq API error: ' . $response]);
    exit;
}

$result = json_decode($response, true);
$modified_text = $result['choices'][0]['message']['content'] ?? 'Could not generate modification.';

echo json_encode(['modified_text' => trim($modified_text)]);
