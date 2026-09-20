<?php
require_once __DIR__ . '/config.php';

// Enforce authentication
require_auth();

$user = get_current_user_profile();
$userEmail = $user['email'] ?? 'User';
$bearerToken = $_SESSION['sb_access_token'] ?? null;

// Query parameters
$universeId = $_GET['universe'] ?? null;
$gameId = $_GET['game'] ?? null;
$editionId = $_GET['edition'] ?? null;
$expansionId = $_GET['expansion'] ?? null;
$activeTab = $_GET['tab'] ?? 'about';

if (!$gameId && !$editionId && !$expansionId) {
    header('Location: index.php');
    exit;
}

// Fetch hierarchy entities
$expansion = null;
$edition = null;
$game = null;
$universe = null;

if ($expansionId) {
    $expansion = supabase_get_expansion($expansionId, $bearerToken);
}

$resolvedEditionId = $editionId ?: ($expansion['edition_id'] ?? null);
if ($resolvedEditionId) {
    $edition = supabase_get_edition($resolvedEditionId, $bearerToken);
}

// Fallback to sequence 1 core expansion if edition has no links/cover (matching Next.js logic)
if (!$expansion && $edition) {
    $expRes = supabase_get_expansions_by_edition($edition['id'], $bearerToken);
    $allExpansions = $expRes['data'] ?? [];
    foreach ($allExpansions as $expCandidate) {
        if (($expCandidate['sequence'] ?? 0) == 1 && empty($edition['cover_image']) && empty($edition['links'])) {
            $expansion = $expCandidate;
            break;
        }
    }
}

$resolvedGameId = $gameId ?: ($edition['game_id'] ?? null);
if ($resolvedGameId) {
    $game = supabase_get_game($resolvedGameId, $bearerToken);
}

if (!$game) {
    header('Location: index.php');
    exit;
}

$resolvedUniverseId = $universeId ?: ($game['universe_id'] ?? null);
if ($resolvedUniverseId) {
    $universe = supabase_get_universe($resolvedUniverseId, $bearerToken);
}

// Determine target entity type and ID
$isExpansion = !empty($expansion);
$isEdition = !$isExpansion && !empty($edition);

$targetEntityType = $isExpansion ? 'expansion' : ($isEdition ? 'edition' : 'game');
$targetEntityId = $isExpansion ? $expansion['id'] : ($isEdition ? $edition['id'] : $game['id']);

// Raw fields
$rawCoverImage = $expansion['cover_image'] ?? $edition['cover_image'] ?? $game['cover_image'] ?? null;
$rawDescription = $expansion['description'] ?? $edition['description'] ?? $game['description'] ?? null;
$rawLinks = $expansion['links'] ?? $edition['links'] ?? $game['links'] ?? [];
if (!is_array($rawLinks)) {
    $rawLinks = [];
}

// Read-only page state
$notice = null;
$error = null;

// Flash messages
if (isset($_GET['msg'])) {
    if ($_GET['msg'] === 'desc_updated') $notice = 'Description updated successfully.';
    if ($_GET['msg'] === 'link_added') $notice = 'Link added successfully.';
    if ($_GET['msg'] === 'link_deleted') $notice = 'Link removed successfully.';
}

// Title and subtitle formatting
$entityName = $expansion['name'] ?? $edition['name'] ?? $game['name'];
$metadata = resolve_game_metadata($entityName, $rawDescription, $rawLinks);

$displayTitle = $expansion 
    ? (strtolower($expansion['name']) === 'core game' ? "{$game['name']}: " . ($edition['name'] ?? $expansion['name']) : $expansion['name'])
    : ($edition ? "{$game['name']}: {$edition['name']}" : $game['name']);

$itemSubtitle = $expansion 
    ? "{$game['name']} • " . ($edition['name'] ?? '') . " Expansion"
    : ($edition ? "{$game['name']} Edition" : "Core Game System");

$displayYear = $expansion['year'] ?? $edition['year'] ?? null;

// Filter links
$resourceLinks = array_filter($rawLinks, 'is_game_resource_link');
$pdfLinks = sort_game_pdf_links(array_filter($rawLinks, 'is_game_pdf_link'));
$imageLinks = array_filter($rawLinks, 'is_game_image_link');

// If entity cover_image is null, resolve from first Rules PDF cover_image (matching Next.js logic)
if (!$rawCoverImage && !empty($pdfLinks)) {
    foreach ($pdfLinks as $pdf) {
        $cat = strtolower($pdf['pdf_category'] ?? 'rules');
        if ($cat === 'rules' && !empty($pdf['cover_image'])) {
            $rawCoverImage = $pdf['cover_image'];
            break;
        }
    }
    if (!$rawCoverImage) {
        foreach ($pdfLinks as $pdf) {
            if (!empty($pdf['cover_image'])) {
                $rawCoverImage = $pdf['cover_image'];
                break;
            }
        }
    }
}
$coverUrl = get_r2_url($rawCoverImage);

// Fetch linked miniatures
$miniatures = supabase_get_game_miniatures(
    $game['id'], 
    $edition['id'] ?? null, 
    $expansionId ?: null, 
    $_SESSION['sb_access_token'] ?? $bearerToken
);

// CSRF token
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($displayTitle) ?> &mdash; Hobby Tracker</title>
    <link rel="stylesheet" href="style.css?v=<?= @filemtime(__DIR__ . '/style.css') ?: time() ?>">
</head>
<body>
    <div class="container-wide">
        <!-- Top Navigation Bar -->
        <header class="top-nav">
            <div class="nav-brand">
                <div class="brand-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                        <polyline points="2 17 12 22 22 17"></polyline>
                        <polyline points="2 12 12 17 22 12"></polyline>
                    </svg>
                </div>
                <div class="nav-title">
                    <h1>Hobby Tracker</h1>
                    <p>Games Catalog</p>
                </div>
            </div>

            <div class="nav-actions">
                <div class="user-badge">
                    <span class="user-dot"></span>
                    <span><?= htmlspecialchars($userEmail) ?></span>
                </div>
                <a href="logout.php" class="btn btn-secondary btn-sm">Sign Out</a>
            </div>
        </header>

        <!-- Breadcrumbs Trail -->
        <nav class="breadcrumb-nav">
            <a href="index.php">Universes</a>
            <?php if ($universe): ?>
                <span class="divider">/</span>
                <a href="index.php?universe=<?= urlencode($universe['id']) ?>"><?= htmlspecialchars($universe['name']) ?></a>
            <?php endif; ?>
            <span class="divider">/</span>
            <a href="index.php?universe=<?= urlencode($resolvedUniverseId ?? '') ?>&game=<?= urlencode($game['id']) ?>"><?= htmlspecialchars($game['name']) ?></a>
            <?php if ($edition): ?>
                <span class="divider">/</span>
                <a href="index.php?universe=<?= urlencode($resolvedUniverseId ?? '') ?>&game=<?= urlencode($game['id']) ?>&edition=<?= urlencode($edition['id']) ?>"><?= htmlspecialchars($edition['name']) ?></a>
            <?php endif; ?>
            <?php if ($expansion): ?>
                <span class="divider">/</span>
                <span class="current"><?= htmlspecialchars($expansion['name']) ?></span>
            <?php endif; ?>
        </nav>

        <!-- Header Titles -->
        <div style="margin-bottom: 1.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #38bdf8;">Game Detail</span>
                <span style="color: var(--text-muted);">&bull;</span>
                <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;"><?= htmlspecialchars($itemSubtitle) ?></span>
            </div>
            <h1 style="font-size: 2rem; font-weight: 800;"><?= htmlspecialchars($displayTitle) ?></h1>
        </div>

        <?php if ($notice): ?>
            <div class="alert alert-success">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span><?= htmlspecialchars($notice) ?></span>
            </div>
        <?php endif; ?>

        <?php if ($error): ?>
            <div class="alert alert-danger">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span><?= htmlspecialchars($error) ?></span>
            </div>
        <?php endif; ?>

        <!-- Main Detail 2-Column Grid -->
        <div class="detail-grid">
            <!-- Left Column: 3D Cover Preview -->
            <div class="cover-container">
                <div class="cover-wrapper" onclick="openCoverLightbox()">
                    <?php if ($coverUrl): ?>
                        <img src="<?= htmlspecialchars($coverUrl) ?>" alt="<?= htmlspecialchars($displayTitle) ?>" class="cover-img" id="mainCoverImg" onerror="handleCoverImgError()">
                        <div class="cover-zoom-hint" id="mainCoverZoom">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            Zoom
                        </div>
                    <?php endif; ?>
                    <div id="mainCoverFallback" class="cover-fallback" style="<?= $coverUrl ? 'display: none;' : '' ?>">
                        <div class="cover-fallback-header"><?= htmlspecialchars($universe['name'] ?? 'Tabletop') ?></div>
                        <div class="cover-fallback-title"><?= htmlspecialchars($displayTitle) ?></div>
                        <div class="cover-fallback-footer"><?= htmlspecialchars($itemSubtitle) ?></div>
                    </div>
                </div>

                <div class="cover-meta">
                    <?php if ($displayYear): ?>
                        <div class="cover-year">Released in <strong><?= htmlspecialchars($displayYear) ?></strong></div>
                    <?php endif; ?>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.35rem;">
                        Publisher: <?= htmlspecialchars($game['publisher'] ?? 'Games Workshop') ?>
                    </div>
                </div>
            </div>

            <!-- Right Column: Tabs Navigation & Panes -->
            <div>
                <!-- Tabs Bar -->
                <div class="tabs-nav">
                    <button class="tab-btn <?= $activeTab === 'about' ? 'active' : '' ?>" onclick="switchTab('about')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        </svg>
                        About &amp; Resources
                    </button>
                    <button class="tab-btn <?= $activeTab === 'pdfs' ? 'active' : '' ?>" onclick="switchTab('pdfs')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        PDF Documents
                        <span class="tab-badge"><?= count($pdfLinks) ?></span>
                    </button>
                    <button class="tab-btn <?= $activeTab === 'images' ? 'active' : '' ?>" onclick="switchTab('images')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        Images
                        <span class="tab-badge"><?= count($imageLinks) ?></span>
                    </button>
                    <button class="tab-btn <?= $activeTab === 'miniatures' ? 'active' : '' ?>" onclick="switchTab('miniatures')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                            <line x1="12" y1="22.08" x2="12" y2="12"></line>
                        </svg>
                        Miniatures
                        <span class="tab-badge"><?= count($miniatures) ?></span>
                    </button>
                </div>

                <!-- Tab 1: About Lore & Resource Links -->
                <div id="tab-about" class="tab-content <?= $activeTab === 'about' ? 'active' : '' ?>">
                    <!-- Lore Section -->
                    <div class="section-card">
                        <div class="section-header">
                            <div>
                                <div class="section-title">About The Game</div>
                                <div class="section-desc">Background lore and game overview</div>
                            </div>
                        </div>
                        <div class="lore-body"><?= htmlspecialchars(trim($metadata['description'] ?? '')) ?></div>
                    </div>

                    <!-- Info & Resources Section -->
                    <div class="section-card">
                        <div class="section-header">
                            <div>
                                <div class="section-title">Info &amp; Resources</div>
                                <div class="section-desc">Community databases, rules wikis, and official references</div>
                            </div>
                        </div>

                        <?php if (empty($resourceLinks)): ?>
                            <div class="empty-state" style="padding: 1.5rem 0;">
                                <p>No resource links added yet.</p>
                            </div>
                        <?php else: ?>
                            <div class="links-list">
                                <?php foreach ($resourceLinks as $l): ?>
                                    <div class="link-item">
                                        <div class="link-info">
                                            <svg class="link-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                            </svg>
                                            <div>
                                                <a href="<?= htmlspecialchars($l['url']) ?>" target="_blank" rel="noopener noreferrer" class="link-title">
                                                    <?= htmlspecialchars($l['title']) ?>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-left: 2px;">
                                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                        <polyline points="15 3 21 3 21 9"></polyline>
                                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                                    </svg>
                                                </a>
                                                <?php if (!empty($l['description'])): ?>
                                                    <div class="link-desc"><?= htmlspecialchars($l['description']) ?></div>
                                                <?php endif; ?>
                                            </div>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>

                <!-- Tab 2: PDFs -->
                <div id="tab-pdfs" class="tab-content <?= $activeTab === 'pdfs' ? 'active' : '' ?>">
                    <div class="section-card">
                        <div class="section-header">
                            <div>
                                <div class="section-title">PDF Documents</div>
                                <div class="section-desc">Rules, reference sheets, errata, and game supplements</div>
                            </div>
                        </div>

                        <?php if (empty($pdfLinks)): ?>
                            <div class="empty-state" style="padding: 2rem 0;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                </svg>
                                <p>No PDF documents registered for this game.</p>
                            </div>
                        <?php else: ?>
                            <?php
                            $groupedPdfs = [];
                            foreach ($pdfLinks as $pdf) {
                                $cat = !empty($pdf['pdf_category']) ? trim($pdf['pdf_category']) : 'Rules';
                                if (!isset($groupedPdfs[$cat])) {
                                    $groupedPdfs[$cat] = [];
                                }
                                $groupedPdfs[$cat][] = $pdf;
                            }

                            uksort($groupedPdfs, function($a, $b) {
                                $isRulesA = (stripos($a, 'rule') !== false);
                                $isRulesB = (stripos($b, 'rule') !== false);
                                if ($isRulesA && !$isRulesB) return -1;
                                if (!$isRulesA && $isRulesB) return 1;

                                $isOtherA = (stripos($a, 'other') !== false);
                                $isOtherB = (stripos($b, 'other') !== false);
                                if ($isOtherA && !$isOtherB) return 1;
                                if (!$isOtherA && $isOtherB) return -1;

                                return strcasecmp($a, $b);
                            });
                            ?>

                            <?php foreach ($groupedPdfs as $catTitle => $catPdfs): ?>
                                <div class="faction-group-section">
                                    <div class="faction-separator">
                                        <div class="faction-separator-title">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                            </svg>
                                            <span><?= htmlspecialchars($catTitle) ?></span>
                                        </div>
                                        <span class="faction-count-badge"><?= count($catPdfs) ?> <?= count($catPdfs) === 1 ? 'document' : 'documents' ?></span>
                                    </div>

                                    <div class="pdf-grid">
                                        <?php foreach ($catPdfs as $pdf): 
                                            $pdfKey = !empty($pdf['url']) ? $pdf['url'] : ($pdf['storage_path'] ?? $pdf['r2_key'] ?? '');
                                            $pdfUrl = get_r2_url($pdfKey);
                                            $pdfCover = !empty($pdf['cover_image']) ? get_r2_url($pdf['cover_image']) : null;
                                        ?>
                                            <div class="pdf-card">
                                                <a href="<?= htmlspecialchars($pdfUrl) ?>" target="_blank" rel="noopener noreferrer" class="pdf-cover-wrap" title="Open <?= htmlspecialchars($pdf['title']) ?>">
                                                    <?php if ($pdfCover): ?>
                                                        <img src="<?= htmlspecialchars($pdfCover) ?>" alt="<?= htmlspecialchars($pdf['title']) ?>" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                                    <?php endif; ?>
                                                    <div class="pdf-cover-fallback" style="<?= $pdfCover ? 'display: none;' : 'display: flex;' ?>">
                                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                            <polyline points="14 2 14 8 20 8"></polyline>
                                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                                            <polyline points="10 9 9 9 8 9"></polyline>
                                                        </svg>
                                                        <span>PDF Document</span>
                                                    </div>
                                                    <div class="pdf-cover-overlay">
                                                        <span class="pdf-open-hint">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                                <polyline points="15 3 21 3 21 9"></polyline>
                                                                <line x1="10" y1="14" x2="21" y2="3"></line>
                                                            </svg>
                                                            Open PDF
                                                        </span>
                                                    </div>
                                                </a>
                                                <div class="pdf-info">
                                                    <a href="<?= htmlspecialchars($pdfUrl) ?>" target="_blank" rel="noopener noreferrer" class="pdf-title-link">
                                                        <div class="pdf-title"><?= htmlspecialchars($pdf['title']) ?></div>
                                                    </a>
                                                    <?php if (!empty($pdf['description'])): ?>
                                                        <div class="pdf-meta"><?= htmlspecialchars($pdf['description']) ?></div>
                                                    <?php endif; ?>
                                                </div>
                                            </div>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>

                <!-- Tab 3: Images -->
                <div id="tab-images" class="tab-content <?= $activeTab === 'images' ? 'active' : '' ?>">
                    <div class="section-card">
                        <div class="section-header">
                            <div>
                                <div class="section-title">Images &amp; Art Gallery</div>
                                <div class="section-desc">Box art, miniatures photos, and promotional graphics</div>
                            </div>
                        </div>

                        <?php if (empty($imageLinks)): ?>
                            <div class="empty-state" style="padding: 2rem 0;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                    <polyline points="21 15 16 10 5 21"></polyline>
                                </svg>
                                <p>No images added to the gallery yet.</p>
                            </div>
                        <?php else: ?>
                            <?php
                            $groupedImages = [];
                            foreach ($imageLinks as $img) {
                                $albumName = !empty($img['album']) ? trim($img['album']) : (!empty($img['category']) && strtolower($img['category']) !== 'image' ? trim($img['category']) : 'Games');
                                if (!isset($groupedImages[$albumName])) {
                                    $groupedImages[$albumName] = [];
                                }
                                $groupedImages[$albumName][] = $img;
                            }

                            uksort($groupedImages, function($a, $b) {
                                $isGamesA = (strcasecmp($a, 'games') === 0);
                                $isGamesB = (strcasecmp($b, 'games') === 0);
                                if ($isGamesA && !$isGamesB) return -1;
                                if (!$isGamesA && $isGamesB) return 1;

                                $isOtherA = (stripos($a, 'other') !== false);
                                $isOtherB = (stripos($b, 'other') !== false);
                                if ($isOtherA && !$isOtherB) return 1;
                                if (!$isOtherA && $isOtherB) return -1;

                                return strcasecmp($a, $b);
                            });
                            ?>

                            <?php foreach ($groupedImages as $albumTitle => $albumImages): ?>
                                <div class="faction-group-section">
                                    <div class="faction-separator">
                                        <div class="faction-separator-title">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                            </svg>
                                            <span><?= htmlspecialchars($albumTitle) ?></span>
                                        </div>
                                        <span class="faction-count-badge"><?= count($albumImages) ?> <?= count($albumImages) === 1 ? 'image' : 'images' ?></span>
                                    </div>

                                    <div class="gallery-grid">
                                        <?php foreach ($albumImages as $img): 
                                            $imgKey = !empty($img['url']) ? $img['url'] : ($img['storage_path'] ?? $img['r2_key'] ?? '');
                                            $imgUrl = get_r2_url($imgKey);
                                        ?>
                                            <div class="gallery-item" onclick="openLightbox('<?= htmlspecialchars($imgUrl) ?>')">
                                                <img src="<?= htmlspecialchars($imgUrl) ?>" alt="<?= htmlspecialchars($img['title'] ?? 'Game image') ?>" loading="lazy">
                                                <div class="gallery-caption"><?= htmlspecialchars($img['title'] ?? '') ?></div>
                                            </div>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>

                <!-- Tab 4: Miniatures -->
                <div id="tab-miniatures" class="tab-content <?= $activeTab === 'miniatures' ? 'active' : '' ?>">
                    <div class="section-card">
                        <div class="section-header">
                            <div>
                                <div class="section-title">Linked Miniatures</div>
                                <div class="section-desc">Miniatures in your collection linked to this game system</div>
                            </div>
                        </div>

                        <?php if (empty($miniatures)): ?>
                            <div class="empty-state" style="padding: 2.5rem 0;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                </svg>
                                <p>No miniatures currently linked to this game.</p>
                            </div>
                        <?php else: ?>
                            <?php
                            $groupedMiniatures = [];
                            foreach ($miniatures as $m) {
                                $fName = !empty($m['factions']['name']) ? trim($m['factions']['name']) : 'No Faction / Neutral';
                                if (!isset($groupedMiniatures[$fName])) {
                                    $groupedMiniatures[$fName] = [];
                                }
                                $groupedMiniatures[$fName][] = $m;
                            }

                            uksort($groupedMiniatures, function($a, $b) {
                                if ($a === 'No Faction / Neutral') return 1;
                                if ($b === 'No Faction / Neutral') return -1;
                                return strcasecmp($a, $b);
                            });

                            $backUrl = $_SERVER['REQUEST_URI'] ?? ('detail.php?game=' . urlencode($game['id']));
                            ?>

                            <?php foreach ($groupedMiniatures as $factionTitle => $fMiniatures): ?>
                                <div class="faction-group-section">
                                    <div class="faction-separator">
                                        <div class="faction-separator-title">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                            </svg>
                                            <span><?= htmlspecialchars($factionTitle) ?></span>
                                        </div>
                                        <span class="faction-count-badge"><?= count($fMiniatures) ?> <?= count($fMiniatures) === 1 ? 'miniature' : 'miniatures' ?></span>
                                    </div>

                                    <div class="miniatures-grid">
                                        <?php 
                                        foreach ($fMiniatures as $m): 
                                            $mId = $m['id'] ?? '';
                                            $mName = $m['name'] ?? 'Miniature';
                                            $mQty = (int)($m['quantity'] ?? 1);
                                            $mFaction = $m['factions']['name'] ?? null;
                                            $mStatus = $m['miniature_status']['status'] ?? 'backlog';
                                            $mBased = !empty($m['miniature_status']['based']);
                                            $mMagnetised = !empty($m['miniature_status']['magnetised']);
                                            $mBox = $m['storage_boxes']['name'] ?? null;
                                            
                                            // Photos already sorted by sort_miniature_photos in supabase_get_game_miniatures
                                            $mPhotos = $m['miniature_photos'] ?? [];
                                            $photoCount = count($mPhotos);
                                            $coverPhoto = $photoCount > 0 ? $mPhotos[0] : null;
                                            $mPhotoUrl = $coverPhoto ? get_photo_image_url($coverPhoto['storage_path'] ?? null, $coverPhoto['image_updated_at'] ?? null) : null;
                                        ?>
                                            <div class="miniature-card">
                                                <a href="miniature.php?id=<?= urlencode($mId) ?>&back=<?= urlencode($backUrl) ?>" class="miniature-card-link" title="View details for <?= htmlspecialchars($mName) ?>">
                                                    <div class="miniature-img-wrap">
                                                        <?php if ($mPhotoUrl): ?>
                                                            <img src="<?= htmlspecialchars($mPhotoUrl) ?>" alt="<?= htmlspecialchars($mName) ?>" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                                                        <?php endif; ?>
                                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="<?= $mPhotoUrl ? 'display: none;' : '' ?>">
                                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                                        </svg>
                                                        
                                                        <?php if ($photoCount > 1): ?>
                                                            <span class="miniature-photo-count-badge" title="<?= $photoCount ?> photos">
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                                    <polyline points="21 15 16 10 5 21"></polyline>
                                                                </svg>
                                                                +<?= $photoCount - 1 ?>
                                                            </span>
                                                        <?php endif; ?>

                                                        <?php if ($mQty > 1): ?>
                                                            <span class="miniature-qty-badge">&times;<?= $mQty ?></span>
                                                        <?php endif; ?>
                                                    </div>
                                                    <div class="miniature-info">
                                                        <div class="miniature-name"><?= htmlspecialchars($mName) ?></div>
                                                        <?php if ($mFaction): ?>
                                                            <div class="miniature-faction"><?= htmlspecialchars($mFaction) ?></div>
                                                        <?php endif; ?>
                                                        <div class="miniature-tags">
                                                            <span class="status-tag status-<?= htmlspecialchars(strtolower($mStatus)) ?>">
                                                                <?= htmlspecialchars(get_miniature_status_label($mStatus)) ?>
                                                            </span>
                                                            <?php if ($mMagnetised): ?>
                                                                <span class="icon-tag" title="Magnetised">🧲</span>
                                                            <?php endif; ?>
                                                            <?php if ($mBased): ?>
                                                                <span class="icon-tag" title="Based">✓</span>
                                                            <?php endif; ?>
                                                            <?php if ($mBox): ?>
                                                                <span class="box-tag" title="Storage Box">📦 <?= htmlspecialchars($mBox) ?></span>
                                                            <?php endif; ?>
                                                        </div>
                                                    </div>
                                                </a>
                                            </div>
                                        <?php endforeach; ?>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>

        <div class="app-footer">
            <p>Hobby Tracker &bull; Powered by Supabase REST API &amp; Pure PHP</p>
        </div>
    </div>

    <!-- Lightbox Modal -->
    <div id="lightboxModal" class="modal-backdrop" onclick="closeModal('lightboxModal')">
        <img id="lightboxImg" class="lightbox-img" src="" alt="Enlarged preview" onclick="event.stopPropagation()">
    </div>

    <script>
        function switchTab(tabName) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabName));
            if (btn) btn.classList.add('active');
            
            const pane = document.getElementById('tab-' + tabName);
            if (pane) pane.classList.add('active');

            const url = new URL(window.location);
            url.searchParams.set('tab', tabName);
            window.history.replaceState({}, '', url);
        }

        function closeModal(id) {
            document.getElementById(id).classList.remove('open');
        }

        let coverImageLoaded = <?= $coverUrl ? 'true' : 'false' ?>;

        function handleCoverImgError() {
            coverImageLoaded = false;
            const img = document.getElementById('mainCoverImg');
            const zoom = document.getElementById('mainCoverZoom');
            const fallback = document.getElementById('mainCoverFallback');
            if (img) img.style.display = 'none';
            if (zoom) zoom.style.display = 'none';
            if (fallback) fallback.style.display = 'flex';
        }

        function openCoverLightbox() {
            if (!coverImageLoaded) return;
            const img = document.getElementById('mainCoverImg');
            if (img && img.src && img.style.display !== 'none') {
                openLightbox(img.src);
            }
        }

        function openLightbox(url) {
            if (!url) return;
            document.getElementById('lightboxImg').src = url;
            document.getElementById('lightboxModal').classList.add('open');
        }
    </script>
</body>
</html>
