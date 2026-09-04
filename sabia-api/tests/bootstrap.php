<?php

// ── 1. Config cacheada ──────────────────────────────────────────────────────
// A config cacheada do container (php artisan config:cache no entrypoint de
// produção) tem precedência sobre TODAS as variáveis de ambiente. Sem este
// passo, os testes herdam o banco e o cache de DESENVOLVIMENTO: o
// RefreshDatabase apaga dados reais (migrate:fresh no db "sabia") e o
// throttle/flags de cache vazam entre execuções. Afastamos o arquivo durante
// a suíte e o devolvemos ao terminar; o app de dev segue funcionando sem ele
// pois as envs do docker-compose são completas.
$configCache = __DIR__.'/../bootstrap/cache/config.php';
$configBackup = $configCache.'.testing-bak';

if (is_file($configCache) && ! is_file($configBackup)) {
    rename($configCache, $configBackup);

    register_shutdown_function(function () use ($configCache, $configBackup) {
        if (is_file($configBackup)) {
            rename($configBackup, $configCache);
        }
    });
}

// ── 2. Overrides de ambiente ───────────────────────────────────────────────
// PHPUnit 10+ removeu o atributo force do <env>: variáveis que já existem no
// ambiente do container (DB_DATABASE=sabia, APP_ENV=local, ...) vencem o
// phpunit.xml. Fixamos aqui, antes de qualquer boot do app, os valores que
// isolam os testes do ambiente de desenvolvimento. DB_HOST/DB_PORT/
// DB_USERNAME/DB_PASSWORD ficam de fora de propósito: dentro do container o
// valor do compose (postgres) é o correto; na máquina host valem os defaults
// do phpunit.xml.
foreach ([
    'APP_ENV' => 'testing',
    'DB_DATABASE' => 'sabia_test',
    'CACHE_STORE' => 'array',
    'SESSION_DRIVER' => 'array',
    'QUEUE_CONNECTION' => 'sync',
    'MAIL_MAILER' => 'array',
    'BROADCAST_CONNECTION' => 'null',
    'BCRYPT_ROUNDS' => '4',
] as $key => $value) {
    $_ENV[$key] = $value;
    $_SERVER[$key] = $value;
    putenv("$key=$value");
}

require __DIR__.'/../vendor/autoload.php';
