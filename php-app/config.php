<?php
/**
 * Supabase PHP Auth - Configuration & Helpers
 * 
 * Drop this file alongside your other PHP files.
 * Configure your Supabase credentials below, or provide them via environment variables / .env.
 */

// 1. Start session with secure cookie parameters
if (session_status() === PHP_SESSION_NONE) {
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

// 2. Helper to check for .env or .env.local in current or parent directories (optional convenience)
function load_env_file($path) {
    if (!file_exists($path) || !is_readable($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $val) = explode('=', $line, 2);
            $key = trim($key);
            $val = trim($val, " \t\n\r\0\x0B\"'");
            if (!array_key_exists($key, $_SERVER) && !array_key_exists($key, $_ENV)) {
                putenv("{$key}={$val}");
                $_ENV[$key] = $val;
                $_SERVER[$key] = $val;
            }
        }
    }
}
load_env_file(__DIR__ . '/.env');
load_env_file(__DIR__ . '/.env.local');
load_env_file(__DIR__ . '/../.env.local');
load_env_file(__DIR__ . '/../.env');

// 3. Supabase Credentials
// Replace the defaults below with your project values, or define them in .env
define('SUPABASE_URL', rtrim(
    getenv('SUPABASE_URL') 
    ?: getenv('NEXT_PUBLIC_SUPABASE_URL') 
    ?: 'https://YOUR_PROJECT_REF.supabase.co', 
    '/'
));

define('SUPABASE_ANON_KEY', 
    getenv('SUPABASE_ANON_KEY') 
    ?: getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY') 
    ?: 'YOUR_SUPABASE_ANON_KEY'
);

/**
 * Perform an HTTP request to Supabase API
 * Uses cURL if available, falls back to file_get_contents with stream context.
 */
function supabase_request($endpoint, $method = 'GET', $data = null, $bearerToken = null) {
    $url = SUPABASE_URL . $endpoint;

    // Use session access token by default if available and not explicitly provided
    if ($bearerToken === null && !empty($_SESSION['sb_access_token'])) {
        $bearerToken = $_SESSION['sb_access_token'];
    }

    $headers = [
        'Content-Type: application/json',
        'apikey: ' . SUPABASE_ANON_KEY,
    ];

    if ($bearerToken) {
        $headers[] = 'Authorization: Bearer ' . $bearerToken;
    }

    $jsonData = $data !== null ? json_encode($data) : null;

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);

        if ($jsonData !== null && in_array($method, ['POST', 'PUT', 'PATCH'])) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonData);
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        if (PHP_VERSION_ID < 80500) {
            @curl_close($ch);
        }

        if ($response === false) {
            return [
                'status' => 0,
                'data' => null,
                'error' => 'cURL error: ' . $curlError
            ];
        }

        $decoded = json_decode($response, true);

        // Auto-refresh expired JWT and retry once if 401 received
        static $isRefreshingCurl = false;
        if ($httpCode === 401 && !empty($_SESSION['sb_refresh_token']) && !$isRefreshingCurl && strpos($endpoint, '/auth/v1/') === false) {
            $isRefreshingCurl = true;
            $refreshed = supabase_refresh_session();
            $isRefreshingCurl = false;
            if ($refreshed && !empty($_SESSION['sb_access_token'])) {
                return supabase_request($endpoint, $method, $data, $_SESSION['sb_access_token']);
            }
        }

        return [
            'status' => $httpCode,
            'data' => $decoded,
            'error' => ($httpCode >= 400) ? ($decoded['error_description'] ?? $decoded['msg'] ?? $decoded['message'] ?? 'API Error') : null
        ];
    } else {
        // Fallback using stream context (file_get_contents)
        $opts = [
            'http' => [
                'method' => $method,
                'header' => implode("\r\n", $headers) . "\r\n",
                'timeout' => 15,
                'ignore_errors' => true
            ]
        ];

        if ($jsonData !== null && in_array($method, ['POST', 'PUT', 'PATCH'])) {
            $opts['http']['content'] = $jsonData;
        }

        $context = stream_context_create($opts);
        $response = @file_get_contents($url, false, $context);

        $headersList = function_exists('http_get_last_response_headers')
            ? (http_get_last_response_headers() ?? [])
            : ($http_response_header ?? []);

        $httpCode = 0;
        if (!empty($headersList) && is_array($headersList)) {
            if (preg_match('/HTTP\/\S+\s+(\d+)/', $headersList[0], $matches)) {
                $httpCode = (int)$matches[1];
            }
        }

        if ($response === false) {
            return [
                'status' => 0,
                'data' => null,
                'error' => 'Unable to connect to Supabase.'
            ];
        }

        $decoded = json_decode($response, true);

        // Auto-refresh expired JWT and retry once if 401 received
        static $isRefreshingStream = false;
        if ($httpCode === 401 && !empty($_SESSION['sb_refresh_token']) && !$isRefreshingStream && strpos($endpoint, '/auth/v1/') === false) {
            $isRefreshingStream = true;
            $refreshed = supabase_refresh_session();
            $isRefreshingStream = false;
            if ($refreshed && !empty($_SESSION['sb_access_token'])) {
                return supabase_request($endpoint, $method, $data, $_SESSION['sb_access_token']);
            }
        }

        return [
            'status' => $httpCode,
            'data' => $decoded,
            'error' => ($httpCode >= 400) ? ($decoded['error_description'] ?? $decoded['msg'] ?? $decoded['message'] ?? 'API Error') : null
        ];
    }
}

/**
 * Refresh the Supabase session using the stored refresh_token
 */
function supabase_refresh_session() {
    $refreshToken = $_SESSION['sb_refresh_token'] ?? null;
    if (empty($refreshToken)) {
        return false;
    }

    $res = supabase_request('/auth/v1/token?grant_type=refresh_token', 'POST', [
        'refresh_token' => $refreshToken
    ]);

    if ($res['status'] === 200 && !empty($res['data']['access_token'])) {
        $_SESSION['sb_access_token'] = $res['data']['access_token'];
        if (!empty($res['data']['refresh_token'])) {
            $_SESSION['sb_refresh_token'] = $res['data']['refresh_token'];
        }
        if (!empty($res['data']['user'])) {
            $_SESSION['sb_user'] = $res['data']['user'];
        }
        $_SESSION['sb_expires_at'] = time() + ($res['data']['expires_in'] ?? 3600);
        return true;
    }

    return false;
}

/**
 * Authenticate against Supabase with email and password
 */
function supabase_login($email, $password) {
    $res = supabase_request('/auth/v1/token?grant_type=password', 'POST', [
        'email' => $email,
        'password' => $password
    ]);

    if ($res['status'] === 200 && !empty($res['data']['access_token'])) {
        // Store in session
        $_SESSION['sb_access_token'] = $res['data']['access_token'];
        $_SESSION['sb_refresh_token'] = $res['data']['refresh_token'] ?? null;
        $_SESSION['sb_user'] = $res['data']['user'] ?? null;
        $_SESSION['sb_expires_at'] = time() + ($res['data']['expires_in'] ?? 3600);

        return ['success' => true, 'user' => $res['data']['user']];
    }

    $errorMessage = $res['error'] ?? 'Authentication failed. Please check your credentials.';
    return ['success' => false, 'error' => $errorMessage];
}

/**
 * Log out and destroy local session
 */
function supabase_logout() {
    if (!empty($_SESSION['sb_access_token'])) {
        // Best-effort logout notification to Supabase
        supabase_request('/auth/v1/logout', 'POST', null, $_SESSION['sb_access_token']);
    }

    // Clear session
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    session_destroy();
}

/**
 * Get the currently logged-in user or null
 */
function get_current_user_profile() {
    return $_SESSION['sb_user'] ?? null;
}

/**
 * Check if the user is authenticated (with token validity check)
 */
function is_authenticated() {
    if (empty($_SESSION['sb_access_token']) || empty($_SESSION['sb_user'])) {
        return false;
    }

    // Check if token has expired
    $expiresAt = $_SESSION['sb_expires_at'] ?? 0;
    if ($expiresAt > 0 && time() >= $expiresAt) {
        if (!empty($_SESSION['sb_refresh_token'])) {
            return supabase_refresh_session();
        }
        return false;
    }

    return true;
}

/**
 * Enforce authentication for protected pages with auto token renewal
 */
function require_auth() {
    if (!is_authenticated()) {
        header('Location: login.php');
        exit;
    }

    // Proactively refresh token if expired or expiring within 120 seconds
    $expiresAt = $_SESSION['sb_expires_at'] ?? 0;
    if ($expiresAt > 0 && time() >= ($expiresAt - 120)) {
        $refreshed = supabase_refresh_session();
        if (!$refreshed && time() >= $expiresAt) {
            supabase_logout();
            header('Location: login.php?msg=session_expired');
            exit;
        }
    }
}

define('R2_PUBLIC_URL', rtrim(
    getenv('PR2_PUBLIC_URL')
    ?: getenv('R2_PUBLIC_URL')
    ?: 'https://pub-a523a8545da3479db04a0bc6b7fa6fa3.r2.dev',
    '/'
));

/**
 * Return full public URL for an R2 key or direct URL
 */
function get_r2_url($keyOrUrl) {
    if (!$keyOrUrl) return '';
    if (strpos($keyOrUrl, 'http://') === 0 || strpos($keyOrUrl, 'https://') === 0 || strpos($keyOrUrl, 'data:') === 0) {
        return $keyOrUrl;
    }
    if (strpos($keyOrUrl, 'logos/') === 0) {
        return '/' . $keyOrUrl;
    }
    $cleanKey = ltrim($keyOrUrl, '/');
    if (!R2_PUBLIC_URL) {
        return '/' . $cleanKey;
    }
    return R2_PUBLIC_URL . '/' . $cleanKey;
}

/**
 * Check if a link represents an image
 */
function is_game_image_link($link) {
    $cat = strtolower($link['category'] ?? '');
    $url = strtolower($link['url'] ?? '');
    $storagePath = strtolower($link['storage_path'] ?? $link['r2_key'] ?? '');
    return (
        $cat === 'image' ||
        strpos($storagePath, '/images/') !== false ||
        strpos($url, '/images/') !== false ||
        preg_match('/\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i', $url)
    );
}

/**
 * Check if a link represents a PDF
 */
function is_game_pdf_link($link) {
    if (strtoupper($link['category'] ?? '') === 'PDF_CATEGORIES_CATALOG') return false;
    if (is_game_image_link($link)) return false;
    $cat = strtolower($link['category'] ?? '');
    $url = strtolower($link['url'] ?? '');
    $storagePath = strtolower($link['storage_path'] ?? $link['r2_key'] ?? '');
    return (
        $cat === 'pdf' ||
        strpos($storagePath, '/pdfs/') !== false ||
        strpos($url, '.pdf') !== false ||
        strpos($url, '/pdfs/') !== false
    );
}

/**
 * Check if a link represents a general resource link
 */
function is_game_resource_link($link) {
    $catUpper = strtoupper($link['category'] ?? '');
    if ($catUpper === 'IMAGE_ALBUMS_CATALOG' || $catUpper === 'PDF_CATEGORIES_CATALOG') return false;
    return !is_game_pdf_link($link) && !is_game_image_link($link);
}

/**
 * Sort PDF links with "Rules" category prioritized first
 */
function sort_game_pdf_links($links) {
    usort($links, function($a, $b) {
        $catA = strtolower($a['pdf_category'] ?? 'rules');
        $catB = strtolower($b['pdf_category'] ?? 'rules');
        $isRulesA = ($catA === 'rules');
        $isRulesB = ($catB === 'rules');
        if ($isRulesA && !$isRulesB) return -1;
        if (!$isRulesA && $isRulesB) return 1;
        if ($catA !== $catB) return strcmp($catA, $catB);
        $posA = $a['position'] ?? PHP_INT_MAX;
        $posB = $b['position'] ?? PHP_INT_MAX;
        if ($posA !== $posB) return $posA <=> $posB;
        return strcasecmp($a['title'] ?? '', $b['title'] ?? '');
    });
    return $links;
}

/**
 * Curated lore and details fallback dictionary
 */
function get_curated_game_details($name) {
    $curated = [
        'Warhammer 40,000' => [
            'coverType' => 'book',
            'description' => 'Warhammer 40,000 is a grimdark tabletop miniature wargame produced by Games Workshop. Set in the dystopian 41st millennium where humanity battles savage aliens, dark gods, and traitors, players command armies of finely detailed Citadel miniatures on tabletop battlefields.'
        ],
        'Combat Patrol' => [
            'coverType' => 'box',
            'description' => 'Combat Patrol is the streamlined, accessible format for Warhammer 40,000. Played with the contents of a single Combat Patrol box per player on a compact battlefield, it delivers fast-paced tactical battles with balanced rules straight out of the box.'
        ],
        'Kill Team' => [
            'coverType' => 'box',
            'description' => 'Kill Team is a fast-paced tabletop skirmish wargame where elite operatives clash in tense, close-quarters firefights. With alternating activations, rich narrative campaigns, and deep customization, each operative matters in high-stakes tactical engagements.'
        ],
        'Hivestorm' => [
            'coverType' => 'box',
            'description' => "Kill Team: Hivestorm is the flagship launch box for the 2024 edition of Kill Team. It plunges players into the war-torn spire city of Volkus, pitting the elite airborne Tempestus Aquilons of the Astra Militarum against the lethal, aerial Vespid Stingwings of the T'au Empire."
        ],
        'Into the Dark' => [
            'coverType' => 'box',
            'description' => 'Kill Team: Into the Dark brings the battle inside the ancient and terrifying corridors of the Space Hulk Gallowdark. Introducing dynamic close-quarters battle rules, modular interior bulkhead walls, and hatchways.'
        ],
        'Starter Set' => [
            'coverType' => 'box',
            'description' => 'The comprehensive entry point into tabletop skirmish gaming, containing complete operative teams, core rulebooks, tokens, dice, measurement gauges, and gaming board terrain.'
        ],
    ];
    return $curated[$name] ?? [];
}

/**
 * Resolve metadata for a game entity
 */
function resolve_game_metadata($name, $fallbackDescription, $customLinks) {
    $curated = get_curated_game_details($name);
    $desc = !empty($fallbackDescription) ? trim($fallbackDescription) : ($curated['description'] ?? "Official release and gaming content for {$name}. Track your rules, expansions, and miniature collections.");
    $coverType = $curated['coverType'] ?? 'box';
    $links = is_array($customLinks) ? $customLinks : [];
    return [
        'description' => $desc,
        'coverType' => $coverType,
        'links' => $links,
    ];
}

/**
 * Fetch Universes with Game Counts (Level 1)
 */
function supabase_get_universes_with_game_counts($bearerToken = null) {
    $endpoint = '/rest/v1/universes?select=id,name,games(id)&order=name.asc';
    $res = supabase_request($endpoint, 'GET', null, $bearerToken);
    if ($res['status'] === 401 && $bearerToken) {
        $res = supabase_request($endpoint, 'GET', null, null);
    }
    return $res;
}

/**
 * Fetch Games for a specific universe (Level 2)
 */
function supabase_get_games_by_universe($universeId, $bearerToken = null) {
    $endpoint = '/rest/v1/games?universe_id=eq.' . urlencode($universeId) . '&select=id,name,sequence,publisher,description,cover_image,editions(id)&order=sequence.asc.nullslast,name.asc';
    $res = supabase_request($endpoint, 'GET', null, $bearerToken);
    if ($res['status'] === 401 && $bearerToken) {
        $res = supabase_request($endpoint, 'GET', null, null);
    }
    return $res;
}

/**
 * Fetch Editions for a specific game (Level 3)
 */
function supabase_get_editions_by_game($gameId, $bearerToken = null) {
    $endpoint = '/rest/v1/editions?game_id=eq.' . urlencode($gameId) . '&select=id,name,sequence,year,description,cover_image,expansions(id)&order=sequence.asc.nullslast,name.asc';
    $res = supabase_request($endpoint, 'GET', null, $bearerToken);
    if ($res['status'] === 401 && $bearerToken) {
        $res = supabase_request($endpoint, 'GET', null, null);
    }
    return $res;
}

/**
 * Fetch Expansions for a specific edition (Level 4)
 */
function supabase_get_expansions_by_edition($editionId, $bearerToken = null) {
    $endpoint = '/rest/v1/expansions?edition_id=eq.' . urlencode($editionId) . '&select=id,name,sequence,year,description,cover_image&order=sequence.asc.nullslast,name.asc';
    $res = supabase_request($endpoint, 'GET', null, $bearerToken);
    if ($res['status'] === 401 && $bearerToken) {
        $res = supabase_request($endpoint, 'GET', null, null);
    }
    return $res;
}

/**
 * Fetch a single Universe by ID
 */
function supabase_get_universe($universeId, $bearerToken = null) {
    $endpoint = '/rest/v1/universes?id=eq.' . urlencode($universeId) . '&select=id,name';
    $res = supabase_request($endpoint, 'GET', null, $bearerToken);
    if ($res['status'] === 401 && $bearerToken) $res = supabase_request($endpoint, 'GET', null, null);
    return (!empty($res['data']) && is_array($res['data'])) ? $res['data'][0] : null;
}

/**
 * Fetch a single Game by ID
 */
function supabase_get_game($gameId, $bearerToken = null) {
    $endpoint = '/rest/v1/games?id=eq.' . urlencode($gameId) . '&select=id,name,description,publisher,universe_id,cover_image,links';
    $res = supabase_request($endpoint, 'GET', null, $bearerToken);
    if ($res['status'] === 401 && $bearerToken) $res = supabase_request($endpoint, 'GET', null, null);
    return (!empty($res['data']) && is_array($res['data'])) ? $res['data'][0] : null;
}

/**
 * Fetch a single Edition by ID
 */
function supabase_get_edition($editionId, $bearerToken = null) {
    $endpoint = '/rest/v1/editions?id=eq.' . urlencode($editionId) . '&select=id,name,sequence,year,description,game_id,cover_image,links';
    $res = supabase_request($endpoint, 'GET', null, $bearerToken);
    if ($res['status'] === 401 && $bearerToken) $res = supabase_request($endpoint, 'GET', null, null);
    return (!empty($res['data']) && is_array($res['data'])) ? $res['data'][0] : null;
}

/**
 * Fetch a single Expansion by ID
 */
function supabase_get_expansion($expansionId, $bearerToken = null) {
    $endpoint = '/rest/v1/expansions?id=eq.' . urlencode($expansionId) . '&select=id,name,sequence,year,description,edition_id,cover_image,links';
    $res = supabase_request($endpoint, 'GET', null, $bearerToken);
    if ($res['status'] === 401 && $bearerToken) $res = supabase_request($endpoint, 'GET', null, null);
    return (!empty($res['data']) && is_array($res['data'])) ? $res['data'][0] : null;
}

/**
 * Sort miniature photos matching Hobby Tracker Next.js logic:
 * 1. display_order ASC (nulls last)
 * 2. uploaded_at ASC (oldest first)
 */
function sort_miniature_photos(&$photos) {
    if (!is_array($photos)) {
        $photos = [];
        return;
    }
    usort($photos, function($a, $b) {
        $orderA = isset($a['display_order']) && $a['display_order'] !== null ? (int)$a['display_order'] : PHP_INT_MAX;
        $orderB = isset($b['display_order']) && $b['display_order'] !== null ? (int)$b['display_order'] : PHP_INT_MAX;
        if ($orderA !== $orderB) {
            return $orderA <=> $orderB;
        }
        $timeA = !empty($a['uploaded_at']) ? strtotime($a['uploaded_at']) : 0;
        $timeB = !empty($b['uploaded_at']) ? strtotime($b['uploaded_at']) : 0;
        return $timeA <=> $timeB;
    });
}

/**
 * Return photo image URL with cache-busting timestamp (?v=...) if image_updated_at is provided
 */
function get_photo_image_url($storagePath, $imageUpdatedAt = null) {
    if (!$storagePath) return '';
    $url = get_r2_url($storagePath);
    if (!$url) return '';
    if (!empty($imageUpdatedAt)) {
        $ts = strtotime($imageUpdatedAt);
        if ($ts > 0) {
            $sep = (strpos($url, '?') !== false) ? '&' : '?';
            $url .= $sep . 'v=' . $ts;
        }
    }
    return $url;
}

/**
 * Fetch Miniatures linked to a game / edition / expansion
 */
function supabase_get_game_miniatures($gameId, $editionId = null, $expansionId = null, $bearerToken = null) {
    if (!$bearerToken && !empty($_SESSION['sb_access_token'])) {
        $bearerToken = $_SESSION['sb_access_token'];
    }

    // Helper to query miniature_games for a given filter
    $fetchMiniatureIds = function($filterQuery) use ($bearerToken) {
        $res = supabase_request('/rest/v1/miniature_games?' . $filterQuery . '&select=miniature_id', 'GET', null, $bearerToken);
        if (($res['status'] ?? 0) >= 400 || empty($res['data']) || !is_array($res['data'])) {
            return [];
        }
        $ids = [];
        foreach ($res['data'] as $r) {
            if (!empty($r['miniature_id'])) {
                $ids[] = $r['miniature_id'];
            }
        }
        return array_unique($ids);
    };

    $minIds = [];

    // Query miniatures strictly matching the scope (expansion, edition, or game) without fallback
    if ($expansionId) {
        $minIds = $fetchMiniatureIds('game_id=eq.' . urlencode($gameId) . '&expansion_id=eq.' . urlencode($expansionId));
    } elseif ($editionId) {
        $minIds = $fetchMiniatureIds('game_id=eq.' . urlencode($gameId) . '&edition_id=eq.' . urlencode($editionId));
    } else {
        $minIds = $fetchMiniatureIds('game_id=eq.' . urlencode($gameId));
    }

    if (empty($minIds)) {
        return [];
    }

    // Query miniatures in list
    $idFilter = implode(',', array_map('urlencode', $minIds));
    $minEndpoint = '/rest/v1/miniatures?id=in.(' . $idFilter . ')&select=id,name,quantity,unit_type,factions(id,name),miniature_status(status,completed_at,based,magnetised),miniature_photos(id,storage_path,display_order,uploaded_at,image_updated_at),storage_boxes(id,name,location)&order=name.asc';
    
    $minRes = supabase_request($minEndpoint, 'GET', null, $bearerToken);

    if (($minRes['status'] ?? 0) >= 400 || empty($minRes['data']) || !is_array($minRes['data'])) {
        return [];
    }

    $miniatures = $minRes['data'];

    // Sort photos for each miniature according to cover photo logic
    foreach ($miniatures as &$m) {
        if (!empty($m['miniature_photos']) && is_array($m['miniature_photos'])) {
            sort_miniature_photos($m['miniature_photos']);
        }
        // Normalize miniature_status if returned as array
        if (isset($m['miniature_status']) && is_array($m['miniature_status']) && isset($m['miniature_status'][0])) {
            $m['miniature_status'] = $m['miniature_status'][0];
        }
    }
    unset($m);

    return $miniatures;
}

/**
 * Fetch complete details for a single miniature by ID
 */
function supabase_get_miniature_detail($miniatureId, $bearerToken = null) {
    // 1. Fetch miniature metadata
    $minEndpoint = '/rest/v1/miniatures?id=eq.' . urlencode($miniatureId) . '&select=*,factions(id,name),miniature_status(status,based,magnetised,started_at,completed_at),storage_boxes(id,name,location),bases(id,name),base_shapes(id,name),base_types(id,name)';
    $minRes = supabase_request($minEndpoint, 'GET', null, $bearerToken);
    if ($minRes['status'] === 401 && $bearerToken) {
        $minRes = supabase_request($minEndpoint, 'GET', null, null);
    }

    if (($minRes['status'] ?? 0) >= 400 || empty($minRes['data']) || !is_array($minRes['data']) || !isset($minRes['data'][0])) {
        return null;
    }
    $miniature = $minRes['data'][0];

    // Normalize status if array
    if (isset($miniature['miniature_status']) && is_array($miniature['miniature_status']) && isset($miniature['miniature_status'][0])) {
        $miniature['miniature_status'] = $miniature['miniature_status'][0];
    }

    // 2. Fetch photos
    $photoEndpoint = '/rest/v1/miniature_photos?miniature_id=eq.' . urlencode($miniatureId) . '&select=*&order=display_order.asc.nullslast,uploaded_at.asc';
    $photoRes = supabase_request($photoEndpoint, 'GET', null, $bearerToken);
    if ($photoRes['status'] === 401 && $bearerToken) {
        $photoRes = supabase_request($photoEndpoint, 'GET', null, null);
    }
    $photos = is_array($photoRes['data'] ?? null) ? $photoRes['data'] : [];
    sort_miniature_photos($photos);
    $miniature['photos'] = $photos;

    // 3. Fetch tags
    $tagEndpoint = '/rest/v1/miniature_tags?miniature_id=eq.' . urlencode($miniatureId) . '&select=tag_id,tags(id,name,color)';
    $tagRes = supabase_request($tagEndpoint, 'GET', null, $bearerToken);
    if ($tagRes['status'] === 401 && $bearerToken) {
        $tagRes = supabase_request($tagEndpoint, 'GET', null, null);
    }
    $miniature['tags'] = [];
    if (!empty($tagRes['data']) && is_array($tagRes['data'])) {
        foreach ($tagRes['data'] as $tRow) {
            if (!empty($tRow['tags'])) {
                $miniature['tags'][] = $tRow['tags'];
            }
        }
    }

    // 4. Fetch linked games
    $gameEndpoint = '/rest/v1/miniature_games?miniature_id=eq.' . urlencode($miniatureId) . '&select=game_id,edition_id,expansion_id,games(id,name,publisher),editions:edition_id(id,name,year),expansions:expansion_id(id,name,year)';
    $gameRes = supabase_request($gameEndpoint, 'GET', null, $bearerToken);
    if ($gameRes['status'] === 401 && $bearerToken) {
        $gameRes = supabase_request($gameEndpoint, 'GET', null, null);
    }
    $miniature['games'] = is_array($gameRes['data'] ?? null) ? $gameRes['data'] : [];

    // 5. Fetch painting recipes
    $recipeEndpoint = '/rest/v1/miniature_recipes?miniature_id=eq.' . urlencode($miniatureId) . '&select=recipe_id,painting_recipes(id,name,description,factions(name),recipe_steps(id,step_order,technique,notes,paint_id,paints(id,name,brand,type,color_hex)))';
    $recipeRes = supabase_request($recipeEndpoint, 'GET', null, $bearerToken);
    if ($recipeRes['status'] === 401 && $bearerToken) {
        $recipeRes = supabase_request($recipeEndpoint, 'GET', null, null);
    }
    $miniature['recipes'] = [];
    if (!empty($recipeRes['data']) && is_array($recipeRes['data'])) {
        foreach ($recipeRes['data'] as $mr) {
            if (!empty($mr['painting_recipes'])) {
                $r = $mr['painting_recipes'];
                // Sort recipe steps by step_order
                if (!empty($r['recipe_steps']) && is_array($r['recipe_steps'])) {
                    usort($r['recipe_steps'], function($sa, $sb) {
                        return ($sa['step_order'] ?? 0) <=> ($sb['step_order'] ?? 0);
                    });
                }
                $miniature['recipes'][] = $r;
            }
        }
    }

    return $miniature;
}

/**
 * Update miniature attributes and status
 */
function supabase_update_miniature($miniatureId, $miniatureData, $statusData = null, $bearerToken = null) {
    if (!empty($miniatureData)) {
        $res = supabase_request('/rest/v1/miniatures?id=eq.' . urlencode($miniatureId), 'PATCH', $miniatureData, $bearerToken);
        if ($res['status'] >= 400) return $res;
    }

    if (!empty($statusData)) {
        // Upsert or update status row
        $statusRes = supabase_request('/rest/v1/miniature_status?miniature_id=eq.' . urlencode($miniatureId), 'PATCH', $statusData, $bearerToken);
        if ($statusRes['status'] >= 400) return $statusRes;
    }

    return ['status' => 200, 'data' => true];
}

/**
 * Fetch available miniature statuses from miniature_statuses table
 */
function supabase_get_miniature_statuses($bearerToken = null) {
    $endpoint = '/rest/v1/miniature_statuses?select=id,name,display_order&order=display_order.asc';
    $res = supabase_request($endpoint, 'GET', null, $bearerToken);
    if ($res['status'] === 401 && $bearerToken) {
        $res = supabase_request($endpoint, 'GET', null, null);
    }
    if (!empty($res['data']) && is_array($res['data'])) {
        return $res['data'];
    }
    // Fallback list if DB table query fails
    return [
        ['name' => 'unknown', 'display_order' => 1],
        ['name' => 'missing', 'display_order' => 2],
        ['name' => 'needs_stripped', 'display_order' => 3],
        ['name' => 'backlog', 'display_order' => 4],
        ['name' => 'built', 'display_order' => 5],
        ['name' => 'primed', 'display_order' => 6],
        ['name' => 'painting_started', 'display_order' => 7],
        ['name' => 'needs_repair', 'display_order' => 8],
        ['name' => 'sub_assembled', 'display_order' => 9],
        ['name' => 'missing_arm', 'display_order' => 10],
        ['name' => 'missing_leg', 'display_order' => 11],
        ['name' => 'missing_head', 'display_order' => 12],
        ['name' => 'complete', 'display_order' => 13],
        ['name' => 'on_sprue', 'display_order' => 14],
    ];
}

/**
 * Return friendly display label for miniature status
 */
function get_miniature_status_label($name) {
    $map = [
        'unknown' => 'Unknown',
        'missing' => 'Missing',
        'needs_stripped' => 'Needs Stripped',
        'backlog' => 'Backlog',
        'on_sprue' => 'On Sprue',
        'built' => 'Built',
        'primed' => 'Primed',
        'painting_started' => 'Painting Started',
        'needs_repair' => 'Needs Repair',
        'sub_assembled' => 'Sub-Assembled',
        'missing_arm' => 'Missing Arm',
        'missing_leg' => 'Missing Leg',
        'missing_head' => 'Missing Head',
        'complete' => 'Complete',
        // Legacy aliases
        'assembled' => 'Built',
        'painting' => 'Painting Started',
        'completed' => 'Complete',
        'in_progress' => 'In Progress',
    ];
    if (isset($map[$name])) {
        return $map[$name];
    }
    return ucwords(str_replace('_', ' ', (string)$name));
}



/**
 * Update entity fields (PATCH)
 */
function supabase_update_entity($entityType, $entityId, $data, $bearerToken = null) {
    $tableMap = [
        'game' => 'games',
        'edition' => 'editions',
        'expansion' => 'expansions'
    ];
    $table = $tableMap[$entityType] ?? 'games';
    $endpoint = '/rest/v1/' . $table . '?id=eq.' . urlencode($entityId);
    return supabase_request($endpoint, 'PATCH', $data, $bearerToken);
}

/**
 * Fetch all games with universe and edition information (used for general search/table)
 */
function supabase_get_games($bearerToken = null) {
    $endpoint = '/rest/v1/games?select=id,name,publisher,description,sequence,universe_id,universes(id,name),editions(id,name,year,sequence)&order=name.asc';
    $res = supabase_request($endpoint, 'GET', null, $bearerToken);
    if ($res['status'] === 401 && $bearerToken) {
        $res = supabase_request($endpoint, 'GET', null, null);
    }
    return $res;
}

/**
 * Fetch universes list for filtering
 */
function supabase_get_universes($bearerToken = null) {
    $endpoint = '/rest/v1/universes?select=id,name&order=name.asc';
    $res = supabase_request($endpoint, 'GET', null, $bearerToken);
    if ($res['status'] === 401 && $bearerToken) {
        $res = supabase_request($endpoint, 'GET', null, null);
    }
    return $res;
}

/**
 * Redirect already logged-in users away from login
 */
function redirect_if_authenticated() {
    if (is_authenticated()) {
        header('Location: index.php');
        exit;
    }
}
