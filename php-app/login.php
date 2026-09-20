<?php
require_once __DIR__ . '/config.php';

// Redirect to dashboard if already authenticated
redirect_if_authenticated();

$error = null;
$notice = null;

// Handle flash notices
if (isset($_GET['msg']) && $_GET['msg'] === 'logged_out') {
    $notice = 'You have been signed out successfully.';
} elseif (isset($_GET['msg']) && $_GET['msg'] === 'session_expired') {
    $error = 'Your session has expired. Please sign in again to continue.';
}

// Generate CSRF token if not set
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// Process login form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrfToken = $_POST['csrf_token'] ?? '';
    if (!hash_equals($_SESSION['csrf_token'], $csrfToken)) {
        $error = 'Invalid security token. Please refresh and try again.';
    } else {
        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';

        if (empty($email) || empty($password)) {
            $error = 'Please enter both your email and password.';
        } else {
            $authResult = supabase_login($email, $password);
            if ($authResult['success']) {
                // Regenerate CSRF token
                $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
                header('Location: index.php');
                exit;
            } else {
                $error = $authResult['error'];
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In &mdash; Supabase Auth</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <div class="brand-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                </div>
                <h1>Welcome Back</h1>
                <p class="subtitle">Authenticate using your Supabase credentials</p>
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

            <form method="POST" action="login.php" autocomplete="on">
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token']) ?>">

                <div class="form-group">
                    <label for="email">Email Address</label>
                    <input 
                        type="email" 
                        id="email" 
                        name="email" 
                        class="input-control" 
                        placeholder="you@example.com" 
                        value="<?= htmlspecialchars($_POST['email'] ?? '') ?>" 
                        required 
                        autofocus
                    >
                </div>

                <div class="form-group">
                    <label for="password">Password</label>
                    <input 
                        type="password" 
                        id="password" 
                        name="password" 
                        class="input-control" 
                        placeholder="••••••••" 
                        required
                    >
                </div>

                <button type="submit" class="btn btn-primary" style="margin-top: 0.5rem;">
                    Sign In
                </button>
            </form>
        </div>

        <div class="app-footer">
            <p>Powered by Supabase GoTrue REST API & PHP</p>
        </div>
    </div>
</body>
</html>
