#!/usr/bin/env python3
"""Genera todos los assets de icono de MyRoutine desde los SVG maestros."""
import json, os, shutil
import cairosvg
from PIL import Image

OUT = "/tmp/icon_build/out"
SRC = "/tmp/icon_build/src"

# ---------- SVG maestros ----------
TILE = ('<linearGradient id="tile" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">'
        '<stop offset="0" stop-color="#2A2440"/><stop offset="1" stop-color="#1A1729"/></linearGradient>')
RING = ('<linearGradient id="ring" x1="86" y1="86" x2="426" y2="426" gradientUnits="userSpaceOnUse">'
        '<stop offset="0" stop-color="#5B7FFF"/><stop offset="1" stop-color="#8B5CB8"/></linearGradient>')

def spark(cx, cy, r, k=0.25):
    """Estrella de 4 puntas (glifo IA), lados cóncavos."""
    p = r * k
    return (f"M{cx},{cy-r} C{cx},{cy-p} {cx+p},{cy} {cx+r},{cy} "
            f"C{cx+p},{cy} {cx},{cy+p} {cx},{cy+r} "
            f"C{cx},{cy+p} {cx-p},{cy} {cx-r},{cy} "
            f"C{cx-p},{cy} {cx},{cy-p} {cx},{cy-r} Z")

ARC = ('<circle cx="256" cy="256" r="140" fill="none" stroke="url(#ring)" stroke-width="54" '
       'stroke-linecap="round" stroke-dasharray="659.73 219.91" transform="rotate(-90 256 256)"/>')
SPARK = f'<path d="{spark(256,256,90)}" fill="#FCE08A"/>'
HEAD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">'

SVGS = {
# Fuente de verdad: tile redondeado con borde sutil.
"logo.svg": HEAD + f'<defs>{TILE}{RING}</defs>'
    '<rect width="512" height="512" rx="112" fill="url(#tile)"/>'
    '<rect x="4" y="4" width="504" height="504" rx="108" fill="none" stroke="#3A3450" stroke-width="8"/>'
    + ARC + SPARK + '</svg>',

# Full bleed: iOS y Android aplican su propia máscara.
"logo-square.svg": HEAD + f'<defs>{TILE}{RING}</defs>'
    '<rect width="512" height="512" fill="url(#tile)"/>' + ARC + SPARK + '</svg>',

# Optimizado 16/32px. Tres ajustes frente al arte grande:
#  1. Color plano en el anillo: el gradiente se enturbia por debajo de 32px.
#  2. Sin borde: a 16px es subpixel y solo deja motas oscuras en las esquinas
#     al antialiasear contra transparencia. La separación respecto a pestañas
#     oscuras se consigue con un tile más claro, no con una línea.
#  3. Estrella más pequeña que el hueco interior del anillo (144 < 224), para
#     que quede aire entre ambos en lugar de empastarse.
"logo-small.svg": HEAD +
    '<defs><linearGradient id="tileS" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">'
    '<stop offset="0" stop-color="#332B52"/><stop offset="1" stop-color="#241F3A"/></linearGradient></defs>'
    '<rect width="512" height="512" rx="96" fill="url(#tileS)"/>'
    '<circle cx="256" cy="256" r="140" fill="none" stroke="#6E7DE2" stroke-width="56" '
    'stroke-linecap="round" stroke-dasharray="659.73 219.91" transform="rotate(-90 256 256)"/>'
    f'<path d="{spark(256,256,72,0.35)}" fill="#FCE08A"/></svg>',

# Solo el arte, sin tile — para capas adaptativas y maskable (safe zone 62%).
"logo-mark.svg": HEAD + f'<defs>{RING}</defs>' + ARC + SPARK + '</svg>',

"android-foreground.svg": HEAD + f'<defs>{RING}</defs>'
    '<g transform="translate(256 256) scale(0.62) translate(-256 -256)">' + ARC + SPARK + '</g></svg>',

"android-background.svg": HEAD + f'<defs>{TILE}</defs>'
    '<rect width="512" height="512" fill="url(#tile)"/></svg>',

# Themed icon Android 13+: silueta monocroma.
"android-monochrome.svg": HEAD +
    '<g transform="translate(256 256) scale(0.62) translate(-256 -256)">'
    '<circle cx="256" cy="256" r="140" fill="none" stroke="#FFFFFF" stroke-width="54" '
    'stroke-linecap="round" stroke-dasharray="659.73 219.91" transform="rotate(-90 256 256)"/>'
    f'<path d="{spark(256,256,90)}" fill="#FFFFFF"/></g></svg>',

# PWA maskable: arte dentro del 62% central sobre tile completo.
"logo-maskable.svg": HEAD + f'<defs>{TILE}{RING}</defs>'
    '<rect width="512" height="512" fill="url(#tile)"/>'
    '<g transform="translate(256 256) scale(0.62) translate(-256 -256)">' + ARC + SPARK + '</g></svg>',
}

os.makedirs(SRC, exist_ok=True)
for name, body in SVGS.items():
    with open(f"{SRC}/{name}", "w") as f:
        f.write(body + "\n")

def png(svg, path, size, flatten=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    cairosvg.svg2png(url=f"{SRC}/{svg}", write_to=path, output_width=size, output_height=size)
    if flatten:  # iOS no admite canal alfa
        im = Image.open(path).convert("RGBA")
        bg = Image.new("RGB", im.size, (26, 23, 41))
        bg.paste(im, mask=im.split()[3])
        bg.save(path)

def circle_mask(path):
    im = Image.open(path).convert("RGBA")
    m = Image.new("L", (im.width * 4, im.height * 4), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(m).ellipse((0, 0, m.width - 1, m.height - 1), fill=255)
    im.putalpha(m.resize(im.size, Image.LANCZOS))
    im.save(path)

if os.path.isdir(OUT):
    shutil.rmtree(OUT)

# ---------- Web / favicon ----------
W = f"{OUT}/web"
png("logo-small.svg", f"{W}/favicon-16x16.png", 16)
png("logo-small.svg", f"{W}/favicon-32x32.png", 32)
png("logo-square.svg", f"{W}/apple-touch-icon.png", 180, flatten=True)
png("logo.svg", f"{W}/icon-192.png", 192)
png("logo.svg", f"{W}/icon-512.png", 512)
png("logo-maskable.svg", f"{W}/icon-maskable-192.png", 192)
png("logo-maskable.svg", f"{W}/icon-maskable-512.png", 512)
shutil.copy(f"{SRC}/logo.svg", f"{W}/logo.svg")
shutil.copy(f"{SRC}/logo-small.svg", f"{W}/favicon.svg")

# favicon.ico multi-resolución.
# Se escribe a mano: PIL solo reescala desde una imagen base, y aquí cada
# resolución debe llevar su propio render (16/32 usan la variante simplificada,
# 48 en adelante ya aguanta el gradiente del arte completo).
import struct

def write_ico(path, renders):
    """renders: lista de (size, svg). Cada entrada va como PNG dentro del ICO."""
    blobs = []
    for s, svg in renders:
        blobs.append((s, cairosvg.svg2png(url=f"{SRC}/{svg}", output_width=s, output_height=s)))
    n = len(blobs)
    header = struct.pack("<HHH", 0, 1, n)
    offset = 6 + 16 * n
    entries, data = b"", b""
    for s, blob in blobs:
        entries += struct.pack("<BBBBHHII", s if s < 256 else 0, s if s < 256 else 0,
                               0, 0, 1, 32, len(blob), offset)
        data += blob
        offset += len(blob)
    with open(path, "wb") as f:
        f.write(header + entries + data)

write_ico(f"{W}/favicon.ico", [
    (16, "logo-small.svg"), (32, "logo-small.svg"),
    (48, "logo.svg"), (64, "logo.svg"),
])

# ---------- iOS AppIcon.appiconset ----------
IOS = f"{OUT}/ios/AppIcon.appiconset"
ios_imgs, seen = [], {}
SPEC = [("iphone", "20x20", 2), ("iphone", "20x20", 3), ("iphone", "29x29", 2), ("iphone", "29x29", 3),
        ("iphone", "40x40", 2), ("iphone", "40x40", 3), ("iphone", "60x60", 2), ("iphone", "60x60", 3),
        ("ios-marketing", "1024x1024", 1)]
for idiom, size, scale in SPEC:
    base = float(size.split("x")[0])
    px = int(base * scale)
    fn = f"icon-{size.split('x')[0]}@{scale}x.png"
    if fn in seen:
        fn = f"icon-{size.split('x')[0]}@{scale}x-{px}.png"
    seen[fn] = True
    png("logo-square.svg", f"{IOS}/{fn}", px, flatten=True)
    ios_imgs.append({"filename": fn, "idiom": idiom, "scale": f"{scale}x", "size": size})
with open(f"{IOS}/Contents.json", "w") as f:
    json.dump({"images": ios_imgs, "info": {"author": "xcode", "version": 1}}, f, indent=2)
    f.write("\n")

# ---------- Android ----------
A = f"{OUT}/android/res"
LAUNCHER = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
ADAPTIVE = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
for d, s in LAUNCHER.items():
    png("logo.svg", f"{A}/mipmap-{d}/ic_launcher.png", s)
    png("logo-square.svg", f"{A}/mipmap-{d}/ic_launcher_round.png", s)
    circle_mask(f"{A}/mipmap-{d}/ic_launcher_round.png")
for d, s in ADAPTIVE.items():
    png("android-foreground.svg", f"{A}/mipmap-{d}/ic_launcher_foreground.png", s)
    png("android-background.svg", f"{A}/mipmap-{d}/ic_launcher_background.png", s)
    png("android-monochrome.svg", f"{A}/mipmap-{d}/ic_launcher_monochrome.png", s)

ADAPTIVE_XML = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
"""
os.makedirs(f"{A}/mipmap-anydpi-v26", exist_ok=True)
for n in ("ic_launcher.xml", "ic_launcher_round.xml"):
    with open(f"{A}/mipmap-anydpi-v26/{n}", "w") as f:
        f.write(ADAPTIVE_XML)

# ---------- manifest ----------
manifest = {
    "name": "MyRoutine",
    "short_name": "MyRoutine",
    "description": "Rutinas diarias con alarmas y asistente de IA.",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#14121F",
    "theme_color": "#14121F",
    "icons": [
        {"src": "/favicon.svg", "type": "image/svg+xml", "sizes": "any"},
        {"src": "/favicon-16x16.png", "type": "image/png", "sizes": "16x16"},
        {"src": "/favicon-32x32.png", "type": "image/png", "sizes": "32x32"},
        {"src": "/apple-touch-icon.png", "type": "image/png", "sizes": "180x180"},
        {"src": "/icon-192.png", "type": "image/png", "sizes": "192x192", "purpose": "any"},
        {"src": "/icon-512.png", "type": "image/png", "sizes": "512x512", "purpose": "any"},
        {"src": "/icon-maskable-192.png", "type": "image/png", "sizes": "192x192", "purpose": "maskable"},
        {"src": "/icon-maskable-512.png", "type": "image/png", "sizes": "512x512", "purpose": "maskable"},
    ],
}
with open(f"{W}/manifest.json", "w") as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)
    f.write("\n")

with open(f"{W}/head-snippet.html", "w") as f:
    f.write("""<!-- MyRoutine — referencias de icono. Pegar dentro de <head>. -->
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16">
<link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#14121F">
""")

print("OK")
for root, _, files in os.walk(OUT):
    for fn in sorted(files):
        print(os.path.join(root, fn).replace(OUT + "/", ""))
