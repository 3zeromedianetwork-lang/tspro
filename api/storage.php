<?php
header('Content-Type: application/json');

$storageFile = __DIR__ . '/../api/app_state.json';

// Ensure data directory exists
if (!file_exists(dirname($storageFile))) {
    mkdir(dirname($storageFile), 0777, true);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // LOAD DATA
    if (file_exists($storageFile)) {
        echo file_get_contents($storageFile);
    } else {
        // Default structure
        echo json_encode([
            'monitored_sites' => [],
            'auto_saved_posts' => [],
            'templates' => (object)[],
            'settings' => (object)[],
            'processed_links' => []
        ]);
    }
} elseif ($method === 'POST') {
    // SAVE DATA
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if ($data) {
        if (file_put_contents($storageFile, json_encode($data, JSON_PRETTY_PRINT))) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Failed to write to file']);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid data provided']);
    }
}
?>
