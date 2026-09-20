<?php
require_once 'config.php';
require_auth();

$user = get_current_user_profile();
$userEmail = $user['email'] ?? 'User';
$bearerToken = $_SESSION['sb_access_token'] ?? null;

$miniatureId = $_GET['id'] ?? null;
$backUrl = $_GET['back'] ?? 'index.php';
// Validate backUrl to prevent open redirects (must be relative or start with our files)
if (strpos($backUrl, 'http://') === 0 || strpos($backUrl, 'https://') === 0 || strpos($backUrl, '//') === 0) {
    $backUrl = 'index.php';
}

if (!$miniatureId) {
    header('Location: ' . $backUrl);
    exit;
}

$notice = $_SESSION['flash_notice'] ?? null;
$error = $_SESSION['flash_error'] ?? null;
unset($_SESSION['flash_notice'], $_SESSION['flash_error']);

// Fetch miniature details
$miniature = supabase_get_miniature_detail($miniatureId, $bearerToken);

if (!$miniature) {
    http_response_code(404);
}

$activeTab = ($_GET['tab'] ?? '') === 'recipes' ? 'recipes' : 'photos';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $miniature ? htmlspecialchars($miniature['name']) : 'Miniature Not Found' ?> &mdash; Hobby Tracker</title>
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
                    <p>Miniature Details</p>
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

        <!-- Back Navigation & Breadcrumbs -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <a href="<?= htmlspecialchars($backUrl) ?>" class="back-link" style="margin-bottom: 0;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                <span>Back to previous page</span>
            </a>

            <?php if ($miniature): 
                $statusSlug = strtolower($miniature['miniature_status']['status'] ?? 'backlog');
            ?>
                <span class="status-tag status-<?= htmlspecialchars($statusSlug) ?>" style="font-size: 0.75rem; padding: 0.3rem 0.75rem;">
                    <?= htmlspecialchars(get_miniature_status_label($statusSlug)) ?>
                </span>
            <?php endif; ?>
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

        <?php if (!$miniature): ?>
            <div class="section-card" style="text-align: center; padding: 4rem 1.5rem;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-muted); margin-bottom: 1rem;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">Miniature Not Found</h2>
                <p style="color: var(--text-muted); margin-bottom: 1.5rem;">The miniature you requested does not exist or you do not have permission to view it.</p>
                <a href="<?= htmlspecialchars($backUrl) ?>" class="btn btn-primary">Return to Catalog</a>
            </div>
        <?php else: 
            $mPhotos = $miniature['photos'] ?? [];
            $mRecipes = $miniature['recipes'] ?? [];
            $mTags = $miniature['tags'] ?? [];
            $mGames = $miniature['games'] ?? [];
            $statusObj = $miniature['miniature_status'] ?? [];
            $currStatus = $statusObj['status'] ?? 'backlog';
            $isBased = !empty($statusObj['based']);
            $isMagnetised = !empty($statusObj['magnetised']);
        ?>
            <!-- Miniature Header -->
            <div style="margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                    <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #38bdf8;">Miniature Details</span>
                    <?php if (!empty($miniature['factions']['name'])): ?>
                        <span style="color: var(--text-muted);">&bull;</span>
                        <span style="font-size: 0.75rem; color: #60a5fa; font-weight: 600; text-transform: uppercase;">
                            <?= htmlspecialchars($miniature['factions']['name']) ?>
                        </span>
                    <?php endif; ?>
                    <?php if (!empty($miniature['unit_type'])): ?>
                        <span style="color: var(--text-muted);">&bull;</span>
                        <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">
                            <?= htmlspecialchars($miniature['unit_type']) ?>
                        </span>
                    <?php endif; ?>
                </div>
                <h1 style="font-size: 2.25rem; font-weight: 800;"><?= htmlspecialchars($miniature['name']) ?></h1>
            </div>

            <!-- Two-Column Layout -->
            <div class="miniature-detail-grid">
                <!-- Left Column: Specs & Linked Games -->
                <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                    <!-- Overview Card -->
                    <div class="section-card" style="margin-bottom: 0;">
                        <div class="section-header">
                            <div class="section-title">Overview &amp; Specs</div>
                        </div>

                        <div class="spec-list">
                            <?php if (!empty($miniature['factions']['name'])): ?>
                                <div class="spec-item">
                                    <span class="spec-label">Faction</span>
                                    <span class="spec-value" style="color: #60a5fa;"><?= htmlspecialchars($miniature['factions']['name']) ?></span>
                                </div>
                            <?php endif; ?>

                            <?php if (!empty($miniature['unit_type'])): ?>
                                <div class="spec-item">
                                    <span class="spec-label">Unit Type</span>
                                    <span class="spec-value"><?= htmlspecialchars($miniature['unit_type']) ?></span>
                                </div>
                            <?php endif; ?>

                            <div class="spec-item">
                                <span class="spec-label">Quantity</span>
                                <span class="spec-value"><?= isset($miniature['quantity']) ? (int)$miniature['quantity'] : 0 ?></span>
                            </div>

                            <div class="spec-item">
                                <span class="spec-label">Status</span>
                                <span class="spec-value">
                                    <span class="status-tag status-<?= htmlspecialchars(strtolower($currStatus)) ?>">
                                        <?= htmlspecialchars(get_miniature_status_label($currStatus)) ?>
                                    </span>
                                </span>
                            </div>

                            <?php if (!empty($miniature['storage_boxes'])): ?>
                                <div class="spec-item">
                                    <span class="spec-label">Storage Location</span>
                                    <span class="spec-value">
                                        📦 <?= htmlspecialchars($miniature['storage_boxes']['name']) ?>
                                        <?php if (!empty($miniature['storage_boxes']['location'])): ?>
                                            <span style="font-weight: 400; font-size: 0.75rem; color: var(--text-muted);">(<?= htmlspecialchars($miniature['storage_boxes']['location']) ?>)</span>
                                        <?php endif; ?>
                                    </span>
                                </div>
                            <?php endif; ?>

                            <?php if (!empty($miniature['bases']['name'])): ?>
                                <div class="spec-item">
                                    <span class="spec-label">Base</span>
                                    <span class="spec-value"><?= htmlspecialchars($miniature['bases']['name']) ?></span>
                                </div>
                            <?php endif; ?>

                            <?php if (!empty($miniature['base_shapes']['name'])): ?>
                                <div class="spec-item">
                                    <span class="spec-label">Base Shape</span>
                                    <span class="spec-value"><?= htmlspecialchars($miniature['base_shapes']['name']) ?></span>
                                </div>
                            <?php endif; ?>

                            <?php if (!empty($miniature['base_types']['name'])): ?>
                                <div class="spec-item">
                                    <span class="spec-label">Base Type</span>
                                    <span class="spec-value"><?= htmlspecialchars($miniature['base_types']['name']) ?></span>
                                </div>
                            <?php endif; ?>

                            <?php if (!empty($miniature['base_size'])): ?>
                                <div class="spec-item">
                                    <span class="spec-label">Base Size</span>
                                    <span class="spec-value"><?= htmlspecialchars($miniature['base_size']) ?></span>
                                </div>
                            <?php endif; ?>

                            <?php if (!empty($miniature['material'])): ?>
                                <div class="spec-item">
                                    <span class="spec-label">Material</span>
                                    <span class="spec-value"><?= htmlspecialchars($miniature['material']) ?></span>
                                </div>
                            <?php endif; ?>

                            <?php if (!empty($miniature['sculptor'])): ?>
                                <div class="spec-item">
                                    <span class="spec-label">Sculptor</span>
                                    <span class="spec-value"><?= htmlspecialchars($miniature['sculptor']) ?></span>
                                </div>
                            <?php endif; ?>

                            <?php if (!empty($miniature['year'])): ?>
                                <div class="spec-item">
                                    <span class="spec-label">Release Year</span>
                                    <span class="spec-value"><?= htmlspecialchars($miniature['year']) ?></span>
                                </div>
                            <?php endif; ?>

                            <?php if (!empty($miniature['created_at'])): ?>
                                <div class="spec-item">
                                    <span class="spec-label">Date Added</span>
                                    <span class="spec-value" style="font-size: 0.8125rem; font-weight: 400;"><?= date('M j, Y', strtotime($miniature['created_at'])) ?></span>
                                </div>
                            <?php endif; ?>
                        </div>

                        <!-- Checkmark Indicators -->
                        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.08);">
                            <div class="spec-badges">
                                <span class="badge-indicator <?= $isMagnetised ? 'active' : '' ?>">
                                    <?= $isMagnetised ? '✓' : '✗' ?> 🧲 Magnetised
                                </span>
                                <span class="badge-indicator <?= $isBased ? 'active' : '' ?>">
                                    <?= $isBased ? '✓' : '✗' ?> Based
                                </span>
                            </div>
                        </div>

                        <!-- Tags Section -->
                        <?php if (!empty($mTags)): ?>
                            <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.08);">
                                <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem;">Tags</div>
                                <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
                                    <?php foreach ($mTags as $t): 
                                        $tColor = $t['color'] ?? '#3b82f6';
                                    ?>
                                        <span class="tag-badge" style="background: <?= htmlspecialchars($tColor) ?>22; border-color: <?= htmlspecialchars($tColor) ?>66; color: #fff;">
                                            <?= htmlspecialchars($t['name'] ?? '') ?>
                                        </span>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        <?php endif; ?>

                        <!-- Notes Section -->
                        <?php if (!empty($miniature['notes'])): ?>
                            <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.08);">
                                <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.4rem;">Notes</div>
                                <p style="font-size: 0.875rem; color: #cbd5e1; line-height: 1.6; white-space: pre-wrap;"><?= htmlspecialchars($miniature['notes']) ?></p>
                            </div>
                        <?php endif; ?>
                    </div>

                    <!-- Linked Games Card -->
                    <div class="section-card" style="margin-bottom: 0;">
                        <div class="section-header">
                            <div class="section-title">Linked Game Systems</div>
                            <div class="section-desc"><?= count($mGames) ?> linked</div>
                        </div>

                        <?php if (empty($mGames)): ?>
                            <p style="font-size: 0.8125rem; color: var(--text-muted); text-align: center; padding: 1rem 0;">Not linked to any specific game system.</p>
                        <?php else: ?>
                            <div class="linked-games-list">
                                <?php foreach ($mGames as $gLink): 
                                    $gName = $gLink['games']['name'] ?? 'Game';
                                    $gPublisher = $gLink['games']['publisher'] ?? '';
                                    $edName = $gLink['editions']['name'] ?? null;
                                    $expName = $gLink['expansions']['name'] ?? null;
                                    
                                    $targetUrl = "detail.php?game=" . urlencode($gLink['game_id'] ?? '');
                                    if (!empty($gLink['edition_id'])) $targetUrl .= "&edition=" . urlencode($gLink['edition_id']);
                                    if (!empty($gLink['expansion_id'])) $targetUrl .= "&expansion=" . urlencode($gLink['expansion_id']);
                                    $targetUrl .= "&tab=miniatures";
                                ?>
                                    <a href="<?= htmlspecialchars($targetUrl) ?>" class="linked-game-item">
                                        <div>
                                            <div class="linked-game-name"><?= htmlspecialchars($gName) ?></div>
                                            <div class="linked-game-sub">
                                                <?php 
                                                $subParts = array_filter([$gPublisher, $edName, $expName]);
                                                echo htmlspecialchars(implode(' • ', $subParts));
                                                ?>
                                            </div>
                                        </div>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted); flex-shrink: 0;">
                                            <polyline points="9 18 15 12 9 6"></polyline>
                                        </svg>
                                    </a>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>

                <!-- Right Column: Tabs (Photos, Recipes, Quick Edit) -->
                <div>
                    <!-- Navigation Tabs -->
                    <div class="tabs-nav" style="margin-bottom: 1.5rem;">
                        <button class="tab-btn <?= $activeTab === 'photos' ? 'active' : '' ?>" onclick="switchTab('photos')">
                            Photos (<?= count($mPhotos) ?>)
                        </button>
                        <button class="tab-btn <?= $activeTab === 'recipes' ? 'active' : '' ?>" onclick="switchTab('recipes')">
                            Painting Recipes (<?= count($mRecipes) ?>)
                        </button>
                    </div>

                    <!-- Tab 1: Photos Gallery -->
                    <div id="tab-photos" class="tab-content <?= $activeTab === 'photos' ? 'active' : '' ?>">
                        <div class="section-card">
                            <div class="section-header">
                                <div>
                                    <div class="section-title">Photo Gallery</div>
                                    <div class="section-desc">Click any photo to open full-resolution inspection lightbox</div>
                                </div>
                            </div>

                            <?php if (empty($mPhotos)): ?>
                                <div class="empty-state" style="padding: 3rem 0;">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                        <polyline points="21 15 16 10 5 21"></polyline>
                                    </svg>
                                    <p>No photos uploaded for this miniature yet.</p>
                                </div>
                            <?php else: ?>
                                <div class="photo-gallery-grid">
                                    <?php 
                                    $photoUrls = [];
                                    $photoCaptions = [];
                                    foreach ($mPhotos as $idx => $photo): 
                                        $pUrl = get_photo_image_url($photo['storage_path'] ?? null, $photo['image_updated_at'] ?? null);
                                        $photoUrls[] = $pUrl;
                                        $photoCaptions[] = $photo['caption'] ?? '';
                                        $isCover = ($idx === 0);
                                    ?>
                                        <div class="photo-gallery-item" onclick="openPhotoLightbox(<?= $idx ?>)" title="<?= htmlspecialchars($photo['caption'] ?? ($miniature['name'] . ' Photo ' . ($idx + 1))) ?>">
                                            <?php if ($isCover): ?>
                                                <span class="cover-star-badge">★ Cover</span>
                                            <?php else: ?>
                                                <span class="photo-num-badge">#<?= $idx + 1 ?></span>
                                            <?php endif; ?>

                                            <img src="<?= htmlspecialchars($pUrl) ?>" alt="<?= htmlspecialchars($photo['caption'] ?? ($miniature['name'] . ' Photo ' . ($idx + 1))) ?>" loading="lazy">

                                            <?php if (!empty($photo['caption'])): ?>
                                                <div class="gallery-caption"><?= htmlspecialchars($photo['caption']) ?></div>
                                            <?php endif; ?>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>

                    <!-- Tab 2: Painting Recipes -->
                    <div id="tab-recipes" class="tab-content <?= $activeTab === 'recipes' ? 'active' : '' ?>">
                        <div class="section-card">
                            <div class="section-header">
                                <div>
                                    <div class="section-title">Linked Painting Recipes</div>
                                    <div class="section-desc">Formulae and step-by-step painting guides linked to this miniature</div>
                                </div>
                            </div>

                            <?php if (empty($mRecipes)): ?>
                                <div class="empty-state" style="padding: 3rem 0;">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                                    </svg>
                                    <p>No painting recipes linked to this miniature yet.</p>
                                </div>
                            <?php else: ?>
                                <div class="recipes-grid">
                                    <?php foreach ($mRecipes as $recipe): 
                                        $rName = $recipe['name'] ?? 'Recipe';
                                        $rDesc = $recipe['description'] ?? '';
                                        $rFaction = $recipe['factions']['name'] ?? null;
                                        $rSteps = $recipe['recipe_steps'] ?? [];
                                    ?>
                                        <div class="recipe-card">
                                            <div class="recipe-header">
                                                <div>
                                                    <div class="recipe-title"><?= htmlspecialchars($rName) ?></div>
                                                    <?php if ($rFaction): ?>
                                                        <div style="font-size: 0.75rem; color: #60a5fa; font-weight: 500;"><?= htmlspecialchars($rFaction) ?></div>
                                                    <?php endif; ?>
                                                    <?php if ($rDesc): ?>
                                                        <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.35rem;"><?= htmlspecialchars($rDesc) ?></p>
                                                    <?php endif; ?>
                                                </div>
                                                <span class="status-tag" style="background: rgba(168, 85, 247, 0.15); color: #d8b4fe; border: 1px solid rgba(168, 85, 247, 0.3);">
                                                    <?= count($rSteps) ?> <?= count($rSteps) === 1 ? 'step' : 'steps' ?>
                                                </span>
                                            </div>

                                            <?php if (empty($rSteps)): ?>
                                                <p style="font-size: 0.8125rem; color: var(--text-muted); font-style: italic;">No steps recorded for this recipe.</p>
                                            <?php else: ?>
                                                <div class="recipe-steps-list">
                                                    <?php foreach ($rSteps as $sIdx => $step): 
                                                        $stepNum = $step['step_order'] ?? ($sIdx + 1);
                                                        $technique = $step['technique'] ?? '';
                                                        $notes = $step['notes'] ?? '';
                                                        $paint = $step['paints'] ?? null;
                                                        $paintName = $paint['name'] ?? 'Paint';
                                                        $paintBrand = $paint['brand'] ?? '';
                                                        $paintType = $paint['type'] ?? '';
                                                        $paintHex = $paint['color_hex'] ?? '#38bdf8';
                                                    ?>
                                                        <div class="recipe-step-item">
                                                            <div class="step-num-pill"><?= $stepNum ?></div>

                                                            <?php if ($paintHex): ?>
                                                                <div class="paint-swatch-box" style="background-color: <?= htmlspecialchars($paintHex) ?>;" title="Color: <?= htmlspecialchars($paintHex) ?>"></div>
                                                            <?php endif; ?>

                                                            <div class="recipe-step-content">
                                                                <div>
                                                                    <span class="step-paint-name"><?= htmlspecialchars($paintName) ?></span>
                                                                    <?php if ($paintBrand): ?>
                                                                        <span style="font-size: 0.75rem; color: var(--text-muted);"> (<?= htmlspecialchars($paintBrand) ?>)</span>
                                                                    <?php endif; ?>
                                                                    <?php if ($technique): ?>
                                                                        <span class="step-technique-tag"><?= htmlspecialchars($technique) ?></span>
                                                                    <?php endif; ?>
                                                                    <?php if ($paintType): ?>
                                                                        <span style="font-size: 0.6875rem; color: var(--text-muted); text-transform: uppercase; margin-left: 0.25rem;">[<?= htmlspecialchars($paintType) ?>]</span>
                                                                    <?php endif; ?>
                                                                </div>
                                                                <?php if ($notes): ?>
                                                                    <div class="step-notes"><?= htmlspecialchars($notes) ?></div>
                                                                <?php endif; ?>
                                                            </div>
                                                        </div>
                                                    <?php endforeach; ?>
                                                </div>
                                            <?php endif; ?>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Enhanced Lightbox Modal with Gallery Carousel -->
            <div id="photoLightbox" class="modal-backdrop" onclick="closePhotoLightbox()">
                <div class="lightbox-modal-wrap" onclick="event.stopPropagation()">
                    <button class="lightbox-nav-btn lightbox-prev" onclick="prevPhoto()" title="Previous (Left Arrow)">&#10094;</button>
                    
                    <div style="position: relative; overflow: hidden; max-width: 85vw; max-height: 80vh; display: flex; align-items: center; justify-content: center;">
                        <img id="lightboxImage" src="" alt="Enlarged photo" class="lightbox-img" style="object-fit: contain; cursor: zoom-in; transition: transform 0.2s ease;" onclick="toggleImageZoom()">
                    </div>
                    
                    <button class="lightbox-nav-btn lightbox-next" onclick="nextPhoto()" title="Next (Right Arrow)">&#10095;</button>
                    
                    <div class="lightbox-bar">
                        <span id="lightboxCounter">Photo 1 of <?= count($mPhotos) ?></span>
                        <span id="lightboxCaption" style="font-weight: 500; color: #fff;"></span>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-secondary btn-sm" onclick="toggleImageZoom()" id="zoomBtn">Zoom In</button>
                            <button class="btn btn-secondary btn-sm" onclick="closePhotoLightbox()">Close (Esc)</button>
                        </div>
                    </div>
                </div>
            </div>

            <script>
                const photoUrls = <?= json_encode($photoUrls) ?>;
                const photoCaptions = <?= json_encode($photoCaptions) ?>;
                let currentPhotoIdx = 0;
                let isZoomed = false;

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

                function openPhotoLightbox(index) {
                    if (!photoUrls || photoUrls.length === 0) return;
                    currentPhotoIdx = index;
                    isZoomed = false;
                    renderLightboxPhoto();
                    document.getElementById('photoLightbox').classList.add('open');
                }

                function closePhotoLightbox() {
                    document.getElementById('photoLightbox').classList.remove('open');
                    resetZoom();
                }

                function renderLightboxPhoto() {
                    const img = document.getElementById('lightboxImage');
                    const counter = document.getElementById('lightboxCounter');
                    const caption = document.getElementById('lightboxCaption');
                    const zoomBtn = document.getElementById('zoomBtn');

                    img.src = photoUrls[currentPhotoIdx];
                    counter.innerText = `Photo ${currentPhotoIdx + 1} of ${photoUrls.length}` + (currentPhotoIdx === 0 ? ' (Cover)' : '');
                    caption.innerText = photoCaptions[currentPhotoIdx] || '';
                    resetZoom();
                }

                function nextPhoto() {
                    if (!photoUrls || photoUrls.length === 0) return;
                    currentPhotoIdx = (currentPhotoIdx + 1) % photoUrls.length;
                    renderLightboxPhoto();
                }

                function prevPhoto() {
                    if (!photoUrls || photoUrls.length === 0) return;
                    currentPhotoIdx = (currentPhotoIdx - 1 + photoUrls.length) % photoUrls.length;
                    renderLightboxPhoto();
                }

                function toggleImageZoom() {
                    const img = document.getElementById('lightboxImage');
                    const zoomBtn = document.getElementById('zoomBtn');
                    isZoomed = !isZoomed;
                    if (isZoomed) {
                        img.style.transform = 'scale(1.75)';
                        img.style.cursor = 'zoom-out';
                        zoomBtn.innerText = 'Zoom Out';
                    } else {
                        img.style.transform = 'scale(1)';
                        img.style.cursor = 'zoom-in';
                        zoomBtn.innerText = 'Zoom In';
                    }
                }

                function resetZoom() {
                    isZoomed = false;
                    const img = document.getElementById('lightboxImage');
                    const zoomBtn = document.getElementById('zoomBtn');
                    if (img) {
                        img.style.transform = 'scale(1)';
                        img.style.cursor = 'zoom-in';
                    }
                    if (zoomBtn) {
                        zoomBtn.innerText = 'Zoom In';
                    }
                }

                // Keyboard Controls for Lightbox
                document.addEventListener('keydown', function(e) {
                    const modal = document.getElementById('photoLightbox');
                    if (!modal || !modal.classList.contains('open')) return;

                    if (e.key === 'ArrowRight') {
                        nextPhoto();
                    } else if (e.key === 'ArrowLeft') {
                        prevPhoto();
                    } else if (e.key === 'Escape') {
                        closePhotoLightbox();
                    }
                });
            </script>
        <?php endif; ?>

        <div class="app-footer">
            <p>Hobby Tracker &bull; Miniature Collection &bull; Pure PHP &amp; Vanilla CSS</p>
        </div>
    </div>
</body>
</html>
