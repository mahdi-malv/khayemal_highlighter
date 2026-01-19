#!/usr/bin/env python3
"""
Simple script to generate extension icons.
Creates PNG icons with a crab emoji on a dark background.
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size):
    # Create a dark background
    img = Image.new('RGB', (size, size), color='#000000')
    draw = ImageDraw.Draw(img)
    
    # Try to use a system font, fallback to default
    try:
        # Try to use a font that supports emoji
        font_size = int(size * 0.7)
        font = ImageFont.truetype("/System/Library/Fonts/Apple Color Emoji.ttc", font_size)
    except:
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Apple Color Emoji.ttc", font_size)
        except:
            # Fallback to default font
            font = ImageFont.load_default()
    
    # Draw crab emoji
    text = "🦀"
    # Get text bounding box
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Center the text
    x = (size - text_width) // 2
    y = (size - text_height) // 2
    
    draw.text((x, y), text, font=font, fill='#FFFFFF')
    
    return img

def main():
    # Create icons directory if it doesn't exist
    os.makedirs('icons', exist_ok=True)
    
    # Generate icons in different sizes
    sizes = [16, 48, 128]
    for size in sizes:
        icon = create_icon(size)
        icon.save(f'icons/icon{size}.png')
        print(f'Created icons/icon{size}.png')
    
    print('All icons generated successfully!')

if __name__ == '__main__':
    main()
