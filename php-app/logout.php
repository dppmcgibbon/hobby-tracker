<?php
require_once __DIR__ . '/config.php';

supabase_logout();

header('Location: login.php?msg=logged_out');
exit;
