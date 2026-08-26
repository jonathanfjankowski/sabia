<?php

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'widget/*'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],

    'allowed_origins' => array_filter(array_map(
        'trim',
        explode(',', env('ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:3000'))
    )),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Session-Id'],

    'exposed_headers' => ['X-Conversation-Id'],

    'max_age' => 86400,

    'supports_credentials' => true,
];
