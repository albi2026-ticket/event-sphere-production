<?php

namespace App\Support\Performance;

use App\Http\Middleware\PerformanceProfiler;
use Illuminate\Routing\ControllerDispatcher;
use Illuminate\Routing\Route;

class ProfilingControllerDispatcher extends ControllerDispatcher
{
    public function dispatch(Route $route, $controller, $method): mixed
    {
        return PerformanceProfiler::time('controller_invocation', fn (): mixed => parent::dispatch($route, $controller, $method));
    }
}
