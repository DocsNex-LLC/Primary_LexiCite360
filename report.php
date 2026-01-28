<?php
/**
 * LexiCite 360 Autopilot Sync Bridge
 * Drop this file into your cPanel public_html directory.
 * It will automatically store analysis results into 'case_study_data.log'.
 */

// Allow cross-origin requests if needed for testing, though normally served from same domain
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Read the raw JSON payload from the request body
    $json = file_get_contents('php://input');
    
    if ($json) {
        $data = json_decode($json, true);
        
        if ($data) {
            // Prepare a pretty-printed, timestamped log entry
            $timestamp = date('Y-m-d H:i:s');
            $logEntry = "========================================\n";
            $logEntry .= "TIMESTAMP: $timestamp\n";
            $logEntry .= "DOCUMENT: " . ($data['documentTitle'] ?? 'Untitled') . "\n";
            $logEntry .= "ID: " . ($data['id'] ?? 'N/A') . "\n";
            $logEntry .= "STATS: " . json_encode($data['stats']) . "\n";
            $logEntry .= "FINDINGS:\n";
            
            foreach ($data['findings'] as $finding) {
                $lawArea = ($finding['areaOfLaw'] ?? 'Unspecified');
                $logEntry .= " - [" . strtoupper($finding['status']) . "] " . $finding['text'] . " (" . ($finding['caseName'] ?? 'Unknown Case') . ") | AREA: $lawArea\n";
            }
            
            $logEntry .= "========================================\n\n";
            
            // Append the log entry to case_study_data.log
            file_put_contents('case_study_data.log', $logEntry, FILE_APPEND | LOCK_EX);
            
            echo json_encode(['status' => 'success', 'message' => 'Report synced to autopilot log.']);
        } else {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Invalid JSON payload.']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'No data received.']);
    }
} else {
    http_response_code(405);
    echo "Method Not Allowed. Use POST to sync report data.";
}
?>