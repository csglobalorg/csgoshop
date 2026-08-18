<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get the requested endpoint from the URL parameter, default to get-products
$endpoint = isset($_GET['endpoint']) ? $_GET['endpoint'] : 'get-products';

// Allowed endpoints to prevent arbitrary requests
$allowed_endpoints = [
    'get-products' => 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/get-products',
    'auth' => 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/auth',
    'get-clicks' => 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/get-clicks',
    'get-my-orders' => 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/get-my-orders',
    'get-referred-orders' => 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/get-referred-orders',
    'track-click' => 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/track-click',
    'submit-order' => 'https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/submit-order'
];

if (!array_key_exists($endpoint, $allowed_endpoints)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid endpoint requested']);
    exit;
}

$url = $allowed_endpoints[$endpoint];
$is_post = $_SERVER['REQUEST_METHOD'] === 'POST';

// Try cURL first
if (function_exists('curl_init')) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30); // Increased timeout
    
    if ($is_post) {
        $input = file_get_contents('php://input');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Content-Type: application/json',
            'Content-Length: ' . strlen($input)
        ));
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($response !== false) {
        http_response_code($httpCode);
        echo $response;
        exit;
    }
}

// Fallback to file_get_contents
if (ini_get('allow_url_fopen')) {
    $opts = [
        'http' => [
            'timeout' => 30, // Increased timeout
            'ignore_errors' => true
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ];
    
    if ($is_post) {
        $opts['http']['method'] = 'POST';
        $opts['http']['header'] = 'Content-Type: application/json';
        $opts['http']['content'] = file_get_contents('php://input');
    }
    
    $context = stream_context_create($opts);
    $response = @file_get_contents($url, false, $context);
    
    if ($response !== false) {
        // Get HTTP code from headers
        if (isset($http_response_header) && is_array($http_response_header)) {
            foreach ($http_response_header as $header) {
                if (preg_match('{HTTP\/\S*\s(\d{3})}', $header, $matches)) {
                    http_response_code($matches[1]);
                    break;
                }
            }
        }
        echo $response;
        exit;
    }
}

// If all fails
http_response_code(500);
echo json_encode([
    'status' => 500,
    'error' => 'Proxy failed. Your hosting might be blocking external API calls.',
    'debug_curl' => function_exists('curl_init') ? 'enabled' : 'disabled',
    'debug_fopen' => ini_get('allow_url_fopen') ? 'enabled' : 'disabled',
    'endpoint' => $endpoint
]);
?>
