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

// Hierarchy resolution
$currentUniverse = null;
$currentGame = null;
$currentEdition = null;

if ($universeId) {
    $currentUniverse = supabase_get_universe($universeId, $bearerToken);
}
if ($gameId) {
    $currentGame = supabase_get_game($gameId, $bearerToken);
    if (!$currentUniverse && !empty($currentGame['universe_id'])) {
        $currentUniverse = supabase_get_universe($currentGame['universe_id'], $bearerToken);
        $universeId = $currentGame['universe_id'];
    }
}
if ($editionId) {
    $currentEdition = supabase_get_edition($editionId, $bearerToken);
}

// Determine view level
// Level 4: Expansions list
// Level 3: Editions list
// Level 2: Games list
// Level 1: Universes list
$level = 1;
if ($editionId && $gameId) {
    $level = 4;
    $expansionsRes = supabase_get_expansions_by_edition($editionId, $bearerToken);
    $items = $expansionsRes['data'] ?? [];
} elseif ($gameId) {
    $level = 3;
    $editionsRes = supabase_get_editions_by_game($gameId, $bearerToken);
    $items = $editionsRes['data'] ?? [];
} elseif ($universeId) {
    $level = 2;
    $gamesRes = supabase_get_games_by_universe($universeId, $bearerToken);
    $items = $gamesRes['data'] ?? [];
} else {
    $level = 1;
    $universesRes = supabase_get_universes_with_game_counts($bearerToken);
    $items = $universesRes['data'] ?? [];
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>
        <?php 
            if ($level === 4) echo htmlspecialchars($currentEdition['name'] ?? 'Expansions') . " &mdash; ";
            elseif ($level === 3) echo htmlspecialchars($currentGame['name'] ?? 'Editions') . " &mdash; ";
            elseif ($level === 2) echo htmlspecialchars($currentUniverse['name'] ?? 'Games') . " &mdash; ";
            else echo "Universes &mdash; ";
        ?>
        Hobby Tracker
    </title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container-wide">
        <!-- Top Navigation Bar -->
        <header class="top-nav">
            <div class="nav-brand">
                <div class="brand-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                        <polyline points="2 17 12 22 22 17"></polyline>
                        <polyline points="2 12 12 17 22 12"></polyline>
                    </svg>
                </div>
                <div class="nav-title">
                    <h1>Hobby Tracker</h1>
                    <p>Tabletop Games &amp; Expansions Catalog</p>
                </div>
            </div>

            <div class="nav-actions">
                <div class="user-badge" title="<?= htmlspecialchars($userEmail) ?>">
                    <span class="user-dot"></span>
                    <span><?= htmlspecialchars($userEmail) ?></span>
                </div>
                <a href="logout.php" class="btn btn-secondary btn-sm">Sign Out</a>
            </div>
        </header>

        <!-- Breadcrumb Navigation -->
        <nav class="breadcrumb-nav">
            <?php if ($level === 1): ?>
                <span class="current">Universes</span>
            <?php else: ?>
                <a href="index.php">Universes</a>
            <?php endif; ?>

            <?php if ($currentUniverse): ?>
                <span class="divider">/</span>
                <?php if ($level === 2): ?>
                    <span class="current"><?= htmlspecialchars($currentUniverse['name']) ?></span>
                <?php else: ?>
                    <a href="index.php?universe=<?= urlencode($currentUniverse['id']) ?>"><?= htmlspecialchars($currentUniverse['name']) ?></a>
                <?php endif; ?>
            <?php endif; ?>

            <?php if ($currentGame): ?>
                <span class="divider">/</span>
                <?php if ($level === 3): ?>
                    <span class="current"><?= htmlspecialchars($currentGame['name']) ?></span>
                <?php else: ?>
                    <a href="index.php?universe=<?= urlencode($universeId ?? '') ?>&game=<?= urlencode($currentGame['id']) ?>"><?= htmlspecialchars($currentGame['name']) ?></a>
                <?php endif; ?>
            <?php endif; ?>

            <?php if ($currentEdition): ?>
                <span class="divider">/</span>
                <span class="current"><?= htmlspecialchars($currentEdition['name']) ?></span>
            <?php endif; ?>
        </nav>

        <!-- Header & Back Action -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
            <div>
                <?php if ($level === 4): ?>
                    <a href="index.php?universe=<?= urlencode($universeId ?? '') ?>&game=<?= urlencode($currentGame['id'] ?? '') ?>" class="back-link">
                        &larr; Back to Editions
                    </a>
                    <h1 style="font-size: 1.75rem; font-weight: 800;"><?= htmlspecialchars($currentEdition['name'] ?? 'Expansions') ?></h1>
                    <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        Expansions for <?= htmlspecialchars($currentGame['name'] ?? 'Game') ?>
                    </p>
                <?php elseif ($level === 3): ?>
                    <a href="index.php?universe=<?= urlencode($universeId ?? '') ?>" class="back-link">
                        &larr; Back to Games
                    </a>
                    <h1 style="font-size: 1.75rem; font-weight: 800;"><?= htmlspecialchars($currentGame['name'] ?? 'Editions') ?></h1>
                    <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        Select an edition or view game details
                    </p>
                <?php elseif ($level === 2): ?>
                    <a href="index.php" class="back-link">
                        &larr; Back to Universes
                    </a>
                    <h1 style="font-size: 1.75rem; font-weight: 800;"><?= htmlspecialchars($currentUniverse['name'] ?? 'Games') ?></h1>
                    <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        Select a game to view editions or game details
                    </p>
                <?php else: ?>
                    <h1 style="font-size: 1.75rem; font-weight: 800;">Universes</h1>
                    <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        Choose a universe to browse its games and expansions catalog
                    </p>
                <?php endif; ?>
            </div>

            <!-- Instant Search Box -->
            <div class="search-box" style="max-width: 320px;">
                <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input 
                    type="text" 
                    id="filterInput" 
                    placeholder="Filter <?= $level === 1 ? 'universes' : ($level === 2 ? 'games' : ($level === 3 ? 'editions' : 'expansions')) ?>..." 
                    oninput="filterRows()"
                >
            </div>
        </div>

        <!-- Catalog Data Table -->
        <div class="table-card">
            <div class="table-responsive">
                <table class="data-table" id="catalogTable">
                    <thead>
                        <tr>
                            <th style="width: 50px;">#</th>
                            <?php if ($level === 1): ?>
                                <th>Universe</th>
                                <th style="width: 140px; text-align: center;">Games Count</th>
                                <th style="width: 50px;"></th>
                            <?php elseif ($level === 2): ?>
                                <th>Game Title</th>
                                <th style="width: 160px; text-align: center;">Editions</th>
                                <th style="width: 50px;"></th>
                            <?php elseif ($level === 3): ?>
                                <th>Edition</th>
                                <th>Release Year</th>
                                <th style="width: 160px; text-align: center;">Expansions</th>
                                <th style="width: 50px;"></th>
                            <?php elseif ($level === 4): ?>
                                <th>Expansion Title</th>
                                <th>Release Year</th>
                                <th style="width: 140px; text-align: center;">Action</th>
                                <th style="width: 50px;"></th>
                            <?php endif; ?>
                        </tr>
                    </thead>
                    <tbody id="catalogTableBody">
                        <?php if (empty($items)): ?>
                            <tr>
                                <td colspan="5" class="empty-state">
                                    <p>No items found in this section.</p>
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($items as $idx => $item): ?>
                                <?php 
                                    // Row Link Resolution with Smart Skipping
                                    $rowLink = '#';
                                    $destinationType = '';
                                    
                                    if ($level === 1) {
                                        // Level 1: Universe -> Games
                                        $rowLink = "index.php?universe=" . urlencode($item['id']);
                                    } elseif ($level === 2) {
                                        // Level 2: Game -> Editions OR Detail (if 0 editions)
                                        $edCount = !empty($item['editions']) ? count($item['editions']) : 0;
                                        if ($edCount > 0) {
                                            $rowLink = "index.php?universe=" . urlencode($universeId ?? '') . "&game=" . urlencode($item['id']);
                                        } else {
                                            $rowLink = "detail.php?universe=" . urlencode($universeId ?? '') . "&game=" . urlencode($item['id']);
                                            $destinationType = 'detail';
                                        }
                                    } elseif ($level === 3) {
                                        // Level 3: Edition -> Expansions OR Detail (if 0 expansions)
                                        $expCount = !empty($item['expansions']) ? count($item['expansions']) : 0;
                                        if ($expCount > 0) {
                                            $rowLink = "index.php?universe=" . urlencode($universeId ?? '') . "&game=" . urlencode($gameId ?? '') . "&edition=" . urlencode($item['id']);
                                        } else {
                                            $rowLink = "detail.php?universe=" . urlencode($universeId ?? '') . "&game=" . urlencode($gameId ?? '') . "&edition=" . urlencode($item['id']);
                                            $destinationType = 'detail';
                                        }
                                    } elseif ($level === 4) {
                                        // Level 4: Expansion -> Detail
                                        $rowLink = "detail.php?universe=" . urlencode($universeId ?? '') . "&game=" . urlencode($gameId ?? '') . "&edition=" . urlencode($editionId ?? '') . "&expansion=" . urlencode($item['id']);
                                        $destinationType = 'detail';
                                    }
                                ?>
                                <tr class="clickable-row filterable-row" onclick="window.location='<?= htmlspecialchars($rowLink) ?>'">
                                    <td class="text-muted" style="font-size: 0.75rem;"><?= $idx + 1 ?></td>

                                    <?php if ($level === 1): ?>
                                        <td>
                                            <span class="game-title" style="font-size: 1rem;"><?= htmlspecialchars($item['name']) ?></span>
                                        </td>
                                        <td style="text-align: center;">
                                            <span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #93c5fd; border-color: rgba(59, 130, 246, 0.25);">
                                                <?= count($item['games'] ?? []) ?> Games
                                            </span>
                                        </td>
                                    <?php elseif ($level === 2): ?>
                                        <td>
                                            <span class="game-title"><?= htmlspecialchars($item['name']) ?></span>
                                        </td>
                                        <td style="text-align: center;">
                                            <?php $edCount = !empty($item['editions']) ? count($item['editions']) : 0; ?>
                                            <?php if ($edCount > 0): ?>
                                                <span class="badge" style="background: rgba(168, 85, 247, 0.15); color: #d8b4fe; border-color: rgba(168, 85, 247, 0.25);">
                                                    <?= $edCount ?> Editions
                                                </span>
                                            <?php else: ?>
                                                <span class="badge" style="background: rgba(34, 197, 94, 0.15); color: #4ade80; border-color: rgba(34, 197, 94, 0.25);" title="No sub-editions; opens game detail directly">
                                                    Game Detail &rarr;
                                                </span>
                                            <?php endif; ?>
                                        </td>
                                    <?php elseif ($level === 3): ?>
                                        <td>
                                            <span class="game-title"><?= htmlspecialchars($item['name']) ?></span>
                                        </td>
                                        <td>
                                            <span class="text-muted"><?= htmlspecialchars($item['year'] ?? 'N/A') ?></span>
                                        </td>
                                        <td style="text-align: center;">
                                            <?php $expCount = !empty($item['expansions']) ? count($item['expansions']) : 0; ?>
                                            <?php if ($expCount > 0): ?>
                                                <span class="badge" style="background: rgba(168, 85, 247, 0.15); color: #d8b4fe; border-color: rgba(168, 85, 247, 0.25);">
                                                    <?= $expCount ?> Expansions
                                                </span>
                                            <?php else: ?>
                                                <span class="badge" style="background: rgba(34, 197, 94, 0.15); color: #4ade80; border-color: rgba(34, 197, 94, 0.25);" title="No expansions; opens edition detail directly">
                                                    Edition Detail &rarr;
                                                </span>
                                            <?php endif; ?>
                                        </td>
                                    <?php elseif ($level === 4): ?>
                                        <td>
                                            <span class="game-title"><?= htmlspecialchars($item['name']) ?></span>
                                        </td>
                                        <td>
                                            <span class="text-muted"><?= htmlspecialchars($item['year'] ?? 'N/A') ?></span>
                                        </td>
                                        <td style="text-align: center;">
                                            <span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border-color: rgba(56, 189, 248, 0.25);">
                                                View Detail &rarr;
                                            </span>
                                        </td>
                                    <?php endif; ?>

                                    <td style="text-align: right;">
                                        <svg class="row-action-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="9 18 15 12 9 6"></polyline>
                                        </svg>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>

            <div id="noMatchRow" class="empty-state" style="display: none;">
                <p>No matching items found.</p>
            </div>
        </div>

        <div class="app-footer">
            <p>Hobby Tracker &bull; Powered by Supabase REST API &amp; Pure PHP</p>
        </div>
    </div>

    <!-- Real-time Filter -->
    <script>
        function filterRows() {
            const query = document.getElementById('filterInput').value.toLowerCase().trim();
            const rows = document.querySelectorAll('.filterable-row');
            let visibleCount = 0;

            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                if (query === '' || text.includes(query)) {
                    row.style.display = '';
                    visibleCount++;
                } else {
                    row.style.display = 'none';
                }
            });

            const noMatch = document.getElementById('noMatchRow');
            if (noMatch) {
                noMatch.style.display = (visibleCount === 0 && rows.length > 0) ? 'block' : 'none';
            }
        }
    </script>
</body>
</html>
