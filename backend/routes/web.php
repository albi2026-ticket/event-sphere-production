<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return ['Laravel' => app()->version()];
});

require __DIR__.'/auth.php';

if (app()->environment('local')) {
    require __DIR__.'/dev-emails.php';
}
