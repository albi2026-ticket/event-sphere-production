<?php

namespace App\Support\Performance;

use App\Http\Middleware\PerformanceProfiler;
use Illuminate\Http\JsonResponse;

class ProfilingJsonResponse extends JsonResponse
{
    public function setData($data = []): static
    {
        return PerformanceProfiler::time('json_encoding', fn (): static => parent::setData($data));
    }
}
