<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Tiketa Email Preview Center</title>
    <style>
        :root {
            color-scheme: light;
            --bg: #f4f6f8;
            --card: #ffffff;
            --text: #111827;
            --muted: #64748b;
            --border: #e6eaf0;
            --brand: #2563eb;
            --ink: #0f172a;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            background: var(--bg);
            color: var(--text);
            font-family: Inter, "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
        }
        .page {
            max-width: 1120px;
            margin: 0 auto;
            padding: 34px 18px 56px;
        }
        .hero {
            background: var(--ink);
            color: #fff;
            border-radius: 18px;
            padding: 30px;
            box-shadow: 0 18px 42px rgba(15, 23, 42, .10);
        }
        .brand {
            font-size: 24px;
            font-weight: 850;
            letter-spacing: 0;
        }
        h1 {
            margin: 28px 0 8px;
            font-size: clamp(30px, 5vw, 48px);
            line-height: 1.05;
            letter-spacing: 0;
        }
        .hero p {
            max-width: 680px;
            margin: 0;
            color: #cbd5e1;
            font-size: 16px;
            line-height: 1.65;
        }
        .toolbar {
            display: flex;
            gap: 12px;
            align-items: center;
            justify-content: space-between;
            margin: 22px 0;
        }
        .search {
            width: min(520px, 100%);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 13px 15px;
            font-size: 15px;
            box-shadow: 0 8px 24px rgba(15, 23, 42, .05);
        }
        .count {
            color: var(--muted);
            font-size: 14px;
            white-space: nowrap;
        }
        .group {
            margin-top: 26px;
        }
        .group h2 {
            margin: 0 0 12px;
            font-size: 18px;
            letter-spacing: 0;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 14px;
        }
        .card {
            display: block;
            min-height: 118px;
            padding: 18px;
            border: 1px solid var(--border);
            border-radius: 14px;
            background: var(--card);
            color: inherit;
            text-decoration: none;
            box-shadow: 0 10px 28px rgba(15, 23, 42, .06);
            transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
        }
        .card:hover {
            transform: translateY(-2px);
            border-color: #bfdbfe;
            box-shadow: 0 18px 36px rgba(15, 23, 42, .10);
        }
        .card-title {
            font-weight: 800;
            font-size: 16px;
            line-height: 1.35;
        }
        .slug {
            margin-top: 10px;
            color: var(--muted);
            font-size: 13px;
            word-break: break-word;
        }
        .description {
            margin-top: 8px;
            color: #475569;
            font-size: 13px;
            line-height: 1.5;
        }
        .actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 14px;
        }
        .pill {
            display: inline-block;
            color: var(--brand);
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 999px;
            padding: 7px 10px;
            font-size: 13px;
            font-weight: 800;
        }
        @media (max-width: 680px) {
            .hero { padding: 24px; }
            .toolbar { display: block; }
            .count { margin-top: 10px; }
        }
    </style>
</head>
<body>
    <main class="page">
        <section class="hero">
            <div class="brand">Tiketa</div>
            <h1>Email Preview Center</h1>
            <p>Development-only previews for Tiketa Blade email templates. These routes are registered only in the local Laravel environment and are not available in production.</p>
        </section>

        <form class="toolbar" method="get" action="{{ route('dev.emails.index') }}">
            <input type="hidden" name="locale" value="{{ $locale }}">
            <input class="search" type="search" name="q" value="{{ $query }}" placeholder="Search email previews...">
            <div class="count">{{ strtoupper($locale) }} · {{ $groups->flatten(1)->count() }} of {{ $total }} previews</div>
        </form>

        @forelse ($groups as $category => $previews)
            <section class="group">
                <h2>{{ $category }}</h2>
                <div class="grid">
                    @foreach ($previews as $slug => $preview)
                        <a class="card" href="{{ route('dev.emails.show', ['slug' => $slug, 'locale' => $locale]) }}" target="_blank" rel="noopener">
                            <div class="card-title">{{ $preview['title'] }}</div>
                            <div class="slug">/dev/emails/{{ $slug }}</div>
                            <div class="description">{{ $preview['description'] }}</div>
                            <div class="actions">
                                <span class="pill">Open {{ strtoupper($locale) }}</span>
                                <span class="pill" onclick="event.preventDefault(); window.open('{{ route('dev.emails.show', ['slug' => $slug, 'locale' => 'en']) }}', '_blank', 'noopener');">EN</span>
                                <span class="pill" onclick="event.preventDefault(); window.open('{{ route('dev.emails.show', ['slug' => $slug, 'locale' => 'sq']) }}', '_blank', 'noopener');">SQ</span>
                            </div>
                        </a>
                    @endforeach
                </div>
            </section>
        @empty
            <section class="group">
                <h2>No previews found</h2>
            </section>
        @endforelse
    </main>
</body>
</html>
