<?php
header('Content-Type: application/json');
require_once 'config.php';

$input = json_decode(file_get_contents('php://input'), true);
$base64Image = $input['image'] ?? '';

if (!$base64Image) {
    echo json_encode(['error' => 'No image data provided']);
    exit;
}

// Groq API Configuration
$apiKey = GROQ_API_KEY;
$url = "https://api.groq.com/openai/v1/chat/completions";

$prompt = "Analyze this news card image and extract the following in JSON format:
- h1: First line of headline
- h2: Second line of headline
- h3: Third line of headline
- date: Date on card
- category: News category/badge
- primaryColor: HEX color of headline text
- footerColor1: HEX color of left footer
- footerColor2: HEX color of right footer
- font: 'Bamini', 'Noto Sans Tamil', or 'Outfit'

Return ONLY valid JSON.";

$data = [
    "model" => "meta-llama/llama-4-scout-17b-16e-instruct",
    "messages" => [
        [
            "role" => "user",
            "content" => [
                [
                    "type" => "text",
                    "text" => $prompt
                ],
                [
                    "type" => "image_url",
                    "image_url" => [
                        "url" => $base64Image // Groq accepts data:image/jpeg;base64,...
                    ]
                ]
            ]
        ]
    ],
    "response_format" => ["type" => "json_object"],
    "temperature" => 0.1
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $apiKey
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    echo json_encode(['error' => 'Curl error: ' . curl_error($ch)]);
    curl_close($ch);
    exit;
}
curl_close($ch);

if ($httpCode !== 200) {
    echo json_encode(['error' => 'Groq Vision error (HTTP ' . $httpCode . '): ' . $response]);
    exit;
}

$result = json_decode($response, true);
$jsonResponse = $result['choices'][0]['message']['content'] ?? '';

echo $jsonResponse;
