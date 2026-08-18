<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

$url = 'https://mohasagor.com.bd/api/reseller/product';
$apiKey = 'A8niclztH9JtzS4t';
$secretKey = '2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'API-KEY: ' . $apiKey,
    'SECRET-KEY: ' . $secretKey
));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(array('error' => curl_error($ch)));
} else {
    http_response_code($httpCode);
    echo $response;
}

curl_close($ch);
?>
