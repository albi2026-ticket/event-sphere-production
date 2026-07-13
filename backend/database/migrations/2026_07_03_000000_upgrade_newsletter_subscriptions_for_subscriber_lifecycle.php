<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('newsletter_subscriptions', function (Blueprint $table): void {
            if (! Schema::hasColumn('newsletter_subscriptions', 'language')) {
                $table->string('language', 8)->default('en')->after('source')->index();
            }

            if (! Schema::hasColumn('newsletter_subscriptions', 'status')) {
                $table->string('status')->default('active')->after('language')->index();
            }

            if (! Schema::hasColumn('newsletter_subscriptions', 'unsubscribed_at')) {
                $table->timestamp('unsubscribed_at')->nullable()->after('subscribed_at')->index();
            }
        });
    }

    public function down(): void
    {
        Schema::table('newsletter_subscriptions', function (Blueprint $table): void {
            if (Schema::hasColumn('newsletter_subscriptions', 'unsubscribed_at')) {
                $table->dropColumn('unsubscribed_at');
            }

            if (Schema::hasColumn('newsletter_subscriptions', 'status')) {
                $table->dropColumn('status');
            }

            if (Schema::hasColumn('newsletter_subscriptions', 'language')) {
                $table->dropColumn('language');
            }
        });
    }
};
