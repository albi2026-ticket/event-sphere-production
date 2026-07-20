<?php

use App\Http\Middleware\PerformanceProfiler;
use Illuminate\Contracts\Http\Kernel as HttpKernelContract;
use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$request = Request::capture();
$kernel = $app->make(HttpKernelContract::class);
$response = $kernel->handle($request);

$responseSendStartedAt = microtime(true);
$response->send();
PerformanceProfiler::markResponseSent($request, (microtime(true) - $responseSendStartedAt) * 1000);

PerformanceProfiler::markKernelTerminateStarted($request);
$kernel->terminate($request, $response);
