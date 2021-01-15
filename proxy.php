<?php
    // This is loading data from Open Hardware Monitor, due to lacking CORS headers.
    $port = 8085; // Using default port, change if needed.
    header('Content-Type: application/json');
    echo file_get_contents("http://localhost:$port/data.json"); 