"""Generate valid PWA icon assets from the repository's valid 1024px source icon."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "icon.png"
OUTPUTS = {
    ROOT / "public" / "icon.png": 192,
    ROOT / "public" / "pwa-192x192-v2.png": 192,
    ROOT / "public" / "pwa-512x512-v2.png": 512,
    ROOT / "public" / "apple-touch-icon.png": 180,
}


def main() -> None:
    with Image.open(SOURCE) as source:
        source.load()
        if source.size != (1024, 1024):
            raise ValueError(f"Expected {SOURCE} to be 1024x1024, got {source.size}")
        if source.format != "PNG":
            raise ValueError(f"Expected {SOURCE} to be PNG, got {source.format}")

        # Keep the source artwork intact and export standards-compliant RGB PNGs.
        image = source.convert("RGB")
        for output, size in OUTPUTS.items():
            output.parent.mkdir(parents=True, exist_ok=True)
            resized = image.resize((size, size), Image.Resampling.LANCZOS)
            resized.save(output, format="PNG", optimize=True)
            print(f"generated {output.relative_to(ROOT)} ({size}x{size})")


if __name__ == "__main__":
    main()
