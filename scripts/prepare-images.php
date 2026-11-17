<?php
// Usage: php scripts/prepare-images.php <manifest.json> <original-images-dir>
// Requires GD with WebP support. Source files stay outside the published site.
if ($argc !== 3 || !function_exists('imagewebp')) {
    fwrite(STDERR, "Usage: php scripts/prepare-images.php <manifest.json> <original-images-dir> (GD/WebP required)\n");
    exit(1);
}
$manifest = json_decode(file_get_contents($argv[1]), true, 512, JSON_THROW_ON_ERROR);
$destination = dirname(__DIR__) . '/images/products';
if (!is_dir($destination)) mkdir($destination, 0755, true);
$count = 0;
// The supplied PNGs have a known invalid embedded profile. GD decodes their
// pixels correctly; suppress that specific metadata warning during conversion.
set_error_handler(function ($severity, $message) {
    return str_contains($message, 'iCCP: known incorrect sRGB profile');
});
foreach ($manifest as $product) {
    foreach ($product['files'] as $file) {
        $original = $argv[2] . '/' . basename($file['file']);
        $source = imagecreatefromstring(file_get_contents($original));
        if (!$source) throw new RuntimeException('Invalid image: ' . $original);
        $width = imagesx($source);
        $height = imagesy($source);
        $ratio = min(1, 960 / max($width, $height));
        $output = imagecreatetruecolor((int)round($width * $ratio), (int)round($height * $ratio));
        imagealphablending($output, false);
        imagesavealpha($output, true);
        imagecopyresampled($output, $source, 0, 0, 0, 0, imagesx($output), imagesy($output), $width, $height);
        $target = $destination . '/' . pathinfo($file['file'], PATHINFO_FILENAME) . '.webp';
        for ($quality = 84; $quality >= 24; $quality -= 6) {
            if (!imagewebp($output, $target, $quality)) throw new RuntimeException('WebP conversion failed');
            clearstatcache(true, $target);
            if (filesize($target) < 150000) break;
        }
        if (filesize($target) >= 150000) throw new RuntimeException('Image exceeds 150 KB: ' . $target);
        imagedestroy($source);
        imagedestroy($output);
        $count++;
    }
}
echo "Optimized $count images to WebP (under 150 KB each).\n";
