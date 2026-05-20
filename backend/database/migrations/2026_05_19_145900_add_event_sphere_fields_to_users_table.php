<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name')->nullable()->after('name');
            $table->string('last_name')->nullable()->after('first_name');
            $table->string('role')->default('user')->after('password')->index();
            $table->string('phone')->nullable()->after('role');
            $table->text('avatar_url')->nullable()->after('phone');
            $table->string('default_city')->nullable()->after('avatar_url');
            $table->boolean('email_notifications')->default(true)->after('default_city');
            $table->boolean('sms_reminders')->default(false)->after('email_notifications');
            $table->boolean('marketing_emails')->default(false)->after('sms_reminders');
            $table->string('organizer_status')->default('none')->after('marketing_emails')->index();
            $table->timestamp('organizer_approved_at')->nullable()->after('organizer_status');
            $table->foreignId('organizer_approved_by')->nullable()->after('organizer_approved_at')->constrained('users')->nullOnDelete();
            $table->string('status')->default('active')->after('organizer_approved_by')->index();
            $table->timestamp('last_login_at')->nullable()->after('status');
            $table->index('created_at');
            $table->index(['role', 'organizer_status']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
            $table->dropIndex(['role']);
            $table->dropIndex(['status']);
            $table->dropIndex(['organizer_status']);
            $table->dropIndex(['role', 'organizer_status']);
            $table->dropForeign(['organizer_approved_by']);
            $table->dropColumn([
                'first_name',
                'last_name',
                'role',
                'phone',
                'avatar_url',
                'default_city',
                'email_notifications',
                'sms_reminders',
                'marketing_emails',
                'organizer_status',
                'organizer_approved_at',
                'organizer_approved_by',
                'status',
                'last_login_at',
            ]);
        });
    }
};
