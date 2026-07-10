<?php

use App\Http\Controllers\Dev\EmailPreviewController;
use Illuminate\Support\Facades\Route;

if (! app()->environment('local')) {
    return;
}

Route::prefix('dev/emails')
    ->name('dev.emails.')
    ->group(function (): void {
        Route::get('/', [EmailPreviewController::class, 'index'])->name('index');
        Route::get('/{slug}', [EmailPreviewController::class, 'show'])->name('show');
    });
