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

// Handle Form Submissions (Add Link, Delete Link, Edit Description)
$notice = null;
$error = null;

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $action = $_POST['action'] ?? '';
    $csrf = $_POST['csrf_token'] ?? '';
    
    if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $csrf)) {
        $error = 'Security token mismatch. Please try again.';
    } else {
        if ($action === 'update_description') {
            $newDesc = trim($_POST['description'] ?? '');
            $updateRes = supabase_update_entity($targetEntityType, $targetEntityId, ['description' => $newDesc], $bearerToken);
            if ($updateRes['status'] < 400) {
                header("Location: detail.php?universe={$resolvedUniverseId}&game={$game['id']}" . 
                    ($edition ? "&edition={$edition['id']}" : "") . 
                    ($expansion ? "&expansion={$expansion['id']}" : "") . 
                    "&tab=about&msg=desc_updated");
                exit;
            } else {
                $error = 'Failed to update description: ' . ($updateRes['error'] ?? 'API Error');
            }
        } elseif ($action === 'add_link') {
            $title = trim($_POST['title'] ?? '');
            $url = trim($_POST['url'] ?? '');
            $category = $_POST['category'] ?? 'resource';
            $pdfCat = trim($_POST['pdf_category'] ?? 'Rules');
            $linkDesc = trim($_POST['description'] ?? '');
            
            if (!empty($title) && !empty($url)) {
                $newLink = [
                    'id' => bin2hex(random_bytes(8)),
                    'title' => $title,
                    'url' => $url,
                    'category' => $category,
                    'pdf_category' => ($category === 'pdf') ? $pdfCat : null,
                    'description' => $linkDesc ?: null,
                    'uploaded_at' => date('c')
                ];
                $updatedLinks = $rawLinks;
                $updatedLinks[] = $newLink;
                
                $updateRes = supabase_update_entity($targetEntityType, $targetEntityId, ['links' => $updatedLinks], $bearerToken);
                if ($updateRes['status'] < 400) {
                    $tabToRedirect = ($category === 'pdf') ? 'pdfs' : (($category === 'image') ? 'images' : 'about');
                    header("Location: detail.php?universe={$resolvedUniverseId}&game={$game['id']}" . 
                        ($edition ? "&edition={$edition['id']}" : "") . 
                        ($expansion ? "&expansion={$expansion['id']}" : "") . 
                        "&tab={$tabToRedirect}&msg=link_added");
                    exit;
                } else {
                    $error = 'Failed to add link: ' . ($updateRes['error'] ?? 'API Error');
                }
            } else {
                $error = 'Please provide both a title and URL.';
            }
        } elseif ($action === 'delete_link') {
            $linkId = $_POST['link_id'] ?? '';
            if (!empty($linkId)) {
                $updatedLinks = array_values(array_filter($rawLinks, function($l) use ($linkId) {
                    return ($l['id'] ?? '') !== $linkId;
                }));
                $updateRes = supabase_update_entity($targetEntityType, $targetEntityId, ['links' => $updatedLinks], $bearerToken);
                if ($updateRes['status'] < 400) {
                    header("Location: detail.php?universe={$resolvedUniverseId}&game={$game['id']}" . 
                        ($edition ? "&edition={$edition['id']}" : "") . 
                        ($expansion ? "&expansion={$expansion['id']}" : "") . 
                        "&tab={$activeTab}&msg=link_deleted");
                    exit;
                } else {
                    $error = 'Failed to delete link: ' . ($updateRes['error'] ?? 'API Error');
                }
            }
        }
    }
}

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
    <link rel="stylesheet" href="style.css">
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
                            <button class="btn btn-secondary btn-sm" onclick="openEditLoreModal()">Edit Lore</button>
                        </div>
                        <div class="lore-body">
                            <?= htmlspecialchars($metadata['description']) ?>
                        </div>
                    </div>

                    <!-- Info & Resources Section -->
                    <div class="section-card">
                        <div class="section-header">
                            <div>
                                <div class="section-title">Info &amp; Resources</div>
                                <div class="section-desc">Community databases, rules wikis, and official references</div>
                            </div>
                            <button class="btn btn-primary btn-sm" onclick="openAddLinkModal('resource')">+ Add Link</button>
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
                                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
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
                                        <div class="link-actions">
                                            <form method="POST" onsubmit="return confirm('Remove this link?');" style="display: inline;">
                                                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token']) ?>">
                                                <input type="hidden" name="action" value="delete_link">
                                                <input type="hidden" name="link_id" value="<?= htmlspecialchars($l['id'] ?? '') ?>">
                                                <button type="submit" class="btn-icon btn-icon-danger" title="Delete">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                        <polyline points="3 6 5 6 21 6"></polyline>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                    </svg>
                                                </button>
                                            </form>
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
                            <button class="btn btn-primary btn-sm" onclick="openAddLinkModal('pdf')">+ Add PDF Link</button>
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
                            <div class="pdf-grid">
                                <?php foreach ($pdfLinks as $pdf): 
                                    $cat = $pdf['pdf_category'] ?? 'Rules';
                                    $pdfKey = !empty($pdf['url']) ? $pdf['url'] : ($pdf['storage_path'] ?? $pdf['r2_key'] ?? '');
                                    $pdfUrl = get_r2_url($pdfKey);
                                ?>
                                    <div class="pdf-card">
                                        <div>
                                            <span class="pdf-category"><?= htmlspecialchars($cat) ?></span>
                                            <div class="pdf-title"><?= htmlspecialchars($pdf['title']) ?></div>
                                            <?php if (!empty($pdf['description'])): ?>
                                                <div class="pdf-meta"><?= htmlspecialchars($pdf['description']) ?></div>
                                            <?php endif; ?>
                                        </div>
                                        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                                            <a href="<?= htmlspecialchars($pdfUrl) ?>" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="flex: 1; text-align: center;">
                                                Open PDF
                                            </a>
                                            <form method="POST" onsubmit="return confirm('Remove this PDF link?');">
                                                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token']) ?>">
                                                <input type="hidden" name="action" value="delete_link">
                                                <input type="hidden" name="link_id" value="<?= htmlspecialchars($pdf['id'] ?? '') ?>">
                                                <button type="submit" class="btn-icon btn-icon-danger" title="Delete">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                        <polyline points="3 6 5 6 21 6"></polyline>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                    </svg>
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            </div>
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
                            <button class="btn btn-primary btn-sm" onclick="openAddLinkModal('image')">+ Add Image Link</button>
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
                            <div class="gallery-grid">
                                <?php foreach ($imageLinks as $img): 
                                    $imgKey = !empty($img['url']) ? $img['url'] : ($img['storage_path'] ?? $img['r2_key'] ?? '');
                                    $imgUrl = get_r2_url($imgKey);
                                ?>
                                    <div class="gallery-item" onclick="openLightbox('<?= htmlspecialchars($imgUrl) ?>')">
                                        <img src="<?= htmlspecialchars($imgUrl) ?>" alt="<?= htmlspecialchars($img['title'] ?? 'Game image') ?>" loading="lazy">
                                        <div class="gallery-caption"><?= htmlspecialchars($img['title'] ?? '') ?></div>
                                    </div>
                                <?php endforeach; ?>
                            </div>
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

    <!-- Edit Lore Modal -->
    <div id="editLoreModal" class="modal-backdrop">
        <div class="modal-box">
            <div class="modal-header">
                <div class="modal-title">Edit Game Lore &amp; Overview</div>
                <button class="modal-close" onclick="closeModal('editLoreModal')">&times;</button>
            </div>
            <form method="POST">
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token']) ?>">
                <input type="hidden" name="action" value="update_description">
                <div class="form-group">
                    <label for="loreText">Description / Lore</label>
                    <textarea id="loreText" name="description" class="input-control" rows="8" style="resize: vertical; font-family: inherit;"><?= htmlspecialchars($rawDescription ?? '') ?></textarea>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal('editLoreModal')">Cancel</button>
                    <button type="submit" class="btn btn-primary btn-sm">Save Description</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Add Link Modal -->
    <div id="addLinkModal" class="modal-backdrop">
        <div class="modal-box">
            <div class="modal-header">
                <div class="modal-title" id="addLinkModalTitle">Add New Link</div>
                <button class="modal-close" onclick="closeModal('addLinkModal')">&times;</button>
            </div>
            <form method="POST">
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token']) ?>">
                <input type="hidden" name="action" value="add_link">
                <input type="hidden" name="category" id="linkCategoryInput" value="resource">
                
                <div class="form-group">
                    <label for="linkTitle">Title</label>
                    <input type="text" id="linkTitle" name="title" class="input-control" placeholder="e.g. Core Rules 2024" required>
                </div>

                <div class="form-group">
                    <label for="linkUrl">URL or R2 Key</label>
                    <input type="text" id="linkUrl" name="url" class="input-control" placeholder="https://... or key/path" required>
                </div>

                <div class="form-group" id="pdfCatGroup" style="display: none;">
                    <label for="pdfCatSelect">PDF Category</label>
                    <select id="pdfCatSelect" name="pdf_category" class="filter-select" style="width: 100%;">
                        <option value="Rules">Rules</option>
                        <option value="Reference">Reference</option>
                        <option value="Errata">Errata</option>
                        <option value="Lore">Lore</option>
                        <option value="House Rules">House Rules</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="linkDescription">Description (optional)</label>
                    <input type="text" id="linkDescription" name="description" class="input-control" placeholder="Brief note or description">
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal('addLinkModal')">Cancel</button>
                    <button type="submit" class="btn btn-primary btn-sm">Add Link</button>
                </div>
            </form>
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

        function openEditLoreModal() {
            document.getElementById('editLoreModal').classList.add('open');
        }

        function openAddLinkModal(category) {
            document.getElementById('linkCategoryInput').value = category;
            const titleEl = document.getElementById('addLinkModalTitle');
            const pdfCatGroup = document.getElementById('pdfCatGroup');
            
            if (category === 'pdf') {
                titleEl.innerText = 'Add PDF Document';
                pdfCatGroup.style.display = 'block';
            } else if (category === 'image') {
                titleEl.innerText = 'Add Image Link';
                pdfCatGroup.style.display = 'none';
            } else {
                titleEl.innerText = 'Add Resource Link';
                pdfCatGroup.style.display = 'none';
            }
            document.getElementById('addLinkModal').classList.add('open');
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
