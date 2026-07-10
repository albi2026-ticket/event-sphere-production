@php
    $baseUrl = rtrim((string) config('services.frontend.url'), '/');
    $supportUrl = $supportUrl ?? $baseUrl.'/support';
    $privacyUrl = $privacyUrl ?? $baseUrl.'/privacy';
    $termsUrl = $termsUrl ?? $baseUrl.'/terms';
    $helpCenterUrl = $helpCenterUrl ?? $baseUrl.'/help';
@endphp

<tr>
    <td class="tk-footer" style="padding:26px 36px 32px;background:#f8fafc;border-top:1px solid #e6eaf0;">
        <p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#64748b;">
            {{ __('emails.email_footer_help') }}
        </p>

        <p style="margin:0 0 18px;font-size:13px;line-height:1.6;color:#64748b;">
            <a class="tk-footer-link" href="{{ $supportUrl }}" style="color:#334155;text-decoration:none;font-weight:700;">{{ __('emails.support') }}</a>
            <span style="color:#cbd5e1;margin:0 8px;">|</span>
            <a class="tk-footer-link" href="{{ $privacyUrl }}" style="color:#334155;text-decoration:none;font-weight:700;">{{ __('emails.privacy') }}</a>
            <span style="color:#cbd5e1;margin:0 8px;">|</span>
            <a class="tk-footer-link" href="{{ $termsUrl }}" style="color:#334155;text-decoration:none;font-weight:700;">{{ __('emails.terms') }}</a>
            <span style="color:#cbd5e1;margin:0 8px;">|</span>
            <a class="tk-footer-link" href="{{ $helpCenterUrl }}" style="color:#334155;text-decoration:none;font-weight:700;">{{ __('emails.help_center') }}</a>
        </p>

        <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
            &copy; {{ date('Y') }} Tiketa. {{ __('emails.all_rights_reserved') }}
        </p>
    </td>
</tr>
