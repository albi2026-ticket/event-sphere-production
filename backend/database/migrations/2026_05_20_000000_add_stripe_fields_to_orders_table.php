<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->string('stripe_checkout_session_id')->nullable()->unique();
            $table->string('stripe_payment_intent_id')->nullable()->index();
            $table->string('stripe_refund_id')->nullable()->index();
            $table->string('stripe_payment_status')->nullable()->index();
            $table->timestamp('checkout_expires_at')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropColumn([
                'stripe_checkout_session_id',
                'stripe_payment_intent_id',
                'stripe_refund_id',
                'stripe_payment_status',
                'checkout_expires_at',
            ]);
        });
    }
};
