from PIL import Image, ImageChops
import os

def trim_image(image):
    bg = Image.new(image.mode, image.size, image.getpixel((0, 0)))
    diff = ImageChops.difference(image, bg)
    diff = ImageChops.add(diff, diff, 2.0, -100)
    bbox = diff.getbbox()
    if bbox:
        return image.crop(bbox)

input_folder = 'booster_pack_images'
output_folder = 'cropped_booster_pack_images'

if not os.path.exists(output_folder):
    os.makedirs(output_folder)

for file_name in os.listdir(input_folder):
    if file_name.endswith('.png'):
        image_path = os.path.join(input_folder, file_name)
        image = Image.open(image_path)
        cropped_image = trim_image(image)
        
        if cropped_image:
            output_path = os.path.join(output_folder, file_name)
            cropped_image.save(output_path)
            print(f'Cropped and saved: {file_name}')
        else:
            print(f'Could not crop: {file_name}')
