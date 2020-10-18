<?php
    // This is loading data from Open Hardware Monitor, due to lacking CORS headers.
    header('Content-Type: application/json');
    echo file_get_contents("http://localhost:8085/data.json"); // Using default port used, change if needed.