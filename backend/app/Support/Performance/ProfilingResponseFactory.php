<?php

namespace App\Support\Performance;

use App\Http\Middleware\PerformanceProfiler;
use Illuminate\Routing\ResponseFactory;

class ProfilingResponseFactory extends ResponseFactory
{
    public function json($data = [], $status = 200, array $headers = [], $options = 0)
    {
        return PerformanceProfiler::time(
            'response_json',
            fn (): ProfilingJsonResponse => new ProfilingJsonResponse($data, $status, $headers, $options)
        );
    }
}
