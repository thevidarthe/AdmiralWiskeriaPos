from PIL import Image, ImageDraw

img_path = r"C:\Users\VIDARTE\.gemini\antigravity\brain\8f2fc730-2f53-45ff-9450-4f6329f560af\media__1779528588158.jpg"
img = Image.open(img_path)

# Bounding box center
x_center = 255
y_center = 545
size = 460  # Size of the square to crop

left = x_center - size // 2
top = y_center - size // 2
right = x_center + size // 2
bottom = y_center + size // 2

# Crop the square
cropped = img.crop((left, top, right, bottom))
cropped = cropped.convert("RGBA")

# Create a circular mask to make everything outside the gold ring transparent
mask = Image.new("L", (size, size), 0)
draw = ImageDraw.Draw(mask)
# Draw white circle (fully opaque) inside
padding = 4
draw.ellipse((padding, padding, size - padding, size - padding), fill=255)

# Apply mask to cropped image
output = Image.new("RGBA", (size, size), (0, 0, 0, 0))
output.paste(cropped, (0, 0), mask=mask)

# Save to public directory of Next.js frontend
output_dir = r"c:\Users\VIDARTE\Downloads\admiral-whiskey-final_1\admiral-pro\frontend\public"
output_path = f"{output_dir}\\logo.png"

output.save(output_path, "PNG")
print(f"Logo cropped and saved successfully to: {output_path}")
print(f"Dimensions: {size}x{size}")
