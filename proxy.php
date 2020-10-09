<?php
    header('Content-Type: application/json');
    echo file_get_contents("http://localhost:8085/data.json");