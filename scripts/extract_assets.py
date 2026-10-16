"""Extrai as imagens PNG embutidas nos frames SVG do Figma e gera os assets do app.

Uso: python3 -I scripts/extract_assets.py FrontendChallenge public/assets

1. Varre os `href="data:image/png;base64,..."` de todos os SVGs, deduplica por SHA-256
   e grava cada imagem única em `<dir-dos-svgs>/raw/<hash10>.png` (fora de `public/`, para
   não publicar 7 MB de PNG que o app não usa).
2. Gera os 16 NFTs (4 ilustrações x 4 tons) em `<saída>/nfts/<n>-400.webp` e `-800.webp`.
3. Gera o hero (`<saída>/hero-<w>.webp`) a partir da ilustração 1.
"""

from __future__ import annotations

import base64
import hashlib
import re
import sys
from io import BytesIO
from pathlib import Path

from PIL import Image

DATA_URI = re.compile(rb'href="data:image/png;base64,([A-Za-z0-9+/=\s]+)"')

# Ilustrações únicas (prefixo do SHA-256), na ordem de `BASES` em src/mocks/fixtures/images.ts.
BASES = ['f20b58b99d', '2a42ba5adc', '326df4c1c0', '9b25d8d723']

# Tons em matriz RGB (PIL `convert('RGB', matrix)`), na ordem de `TONES` no mesmo arquivo.
TONES: list[tuple[float, ...] | None] = [
    None,  # tons originais
    (1.12, 0.10, 0.0, 0.0, 0.04, 0.98, 0.0, 0.0, 0.0, 0.06, 0.62, 0.0),  # âmbar
    (0.78, 0.0, 0.08, 0.0, 0.0, 0.94, 0.12, 0.0, 0.06, 0.12, 1.12, 6.0),  # frio
    (0.52, 0.0, 0.06, 0.0, 0.0, 0.56, 0.12, 0.0, 0.06, 0.10, 0.86, 8.0),  # noturno
]

NFT_WIDTHS = (400, 800)
HERO_WIDTHS = (450, 900)
QUALITY = 80


def extract(src: Path, raw_dir: Path) -> dict[str, Path]:
    raw_dir.mkdir(parents=True, exist_ok=True)
    found: dict[str, Path] = {}
    for svg in sorted(src.rglob('*.svg')):
        for match in DATA_URI.finditer(svg.read_bytes()):
            data = base64.b64decode(re.sub(rb'\s', b'', match.group(1)))
            digest = hashlib.sha256(data).hexdigest()[:10]
            if digest in found:
                continue
            out = raw_dir / f'{digest}.png'
            out.write_bytes(data)
            found[digest] = out
    return found


def square(img: Image.Image) -> Image.Image:
    side = min(img.size)
    left = (img.width - side) // 2
    top = (img.height - side) // 2
    return img.crop((left, top, left + side, top + side))


def save_webp(img: Image.Image, out: Path, width: int) -> None:
    height = round(img.height * width / img.width)
    img.resize((width, height), Image.LANCZOS).save(out, 'WEBP', quality=QUALITY, method=6)


def main(src: Path, dest: Path) -> None:
    raw = extract(src, src / 'raw')
    for digest, path in sorted(raw.items()):
        with Image.open(path) as im:
            print(f'raw {digest} {im.width}x{im.height}')

    missing = [b for b in BASES if b not in raw]
    if missing:
        sys.exit(f'ilustrações ausentes nos SVGs: {missing}')

    nft_dir = dest / 'nfts'
    nft_dir.mkdir(parents=True, exist_ok=True)
    bases = [square(Image.open(raw[b]).convert('RGB')) for b in BASES]
    for t, matrix in enumerate(TONES):
        for b, base in enumerate(bases):
            n = t * len(BASES) + b + 1
            img = base if matrix is None else base.convert('RGB', matrix)
            for w in NFT_WIDTHS:
                save_webp(img, nft_dir / f'{n}-{w}.webp', w)

    for w in HERO_WIDTHS:
        save_webp(bases[0], dest / f'hero-{w}.webp', w)
    print(f'{len(bases) * len(TONES)} NFTs e hero gerados em {dest}')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit('uso: extract_assets.py <dir-dos-svgs> <dir-de-saída>')
    main(Path(sys.argv[1]), Path(sys.argv[2]))
