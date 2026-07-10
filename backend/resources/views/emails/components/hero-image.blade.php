@if (! empty($src))
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
        <tr>
            <td style="border-radius:16px;overflow:hidden;background:#e6eaf0;">
                <img src="{{ $src }}" alt="{{ $alt ?? 'Tiketa' }}" width="528" style="display:block;width:100%;max-width:528px;height:auto;border:0;line-height:100%;">
            </td>
        </tr>
    </table>
@endif
