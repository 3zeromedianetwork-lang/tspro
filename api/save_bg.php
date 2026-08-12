<?php
$data = json_decode(file_get_contents('php://input'), true);
if (isset($data['backgroundImage'])) {
    $base64 = $data['backgroundImage'];
    // Format: data:image/png;base64,...
    list($type, $base64) = explode(';', $base64);
    list(, $base64) = explode(',', $base64);
    $imgData = base64_decode($base64);
    file_put_contents('../assets/red_template.png', $imgData);
    echo "Saved";
} else {
    echo "No image";
}
?>
