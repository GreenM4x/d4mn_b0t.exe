import os
import requests
from bs4 import BeautifulSoup
from fake_useragent import UserAgent
from urllib.parse import urljoin

def save_image(url, file_path):
    response = requests.get(url, stream=True)
    with open(file_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)

def fetch_images_from_yugipedia():
    url = "https://yugipedia.com/wiki/TCG_Set_Galleries:_Boosters"
    ua = UserAgent()

    headers = {'User-Agent': ua.random}

    try:
        response = requests.get(url, headers=headers)
    except requests.exceptions.RequestException as e:
        print(f"Failed to fetch the webpage. Error: {e}")
        return

    soup = BeautifulSoup(response.content, "html.parser")

    image_folder = "booster_pack_images_all"
    if not os.path.exists(image_folder):
        os.makedirs(image_folder)

    for gallerybox in soup.find_all("li", class_="gallerybox"):
        image_tag = gallerybox.find("img")
        image_url = urljoin(url, image_tag["src"])
        # https://ms.yugipedia.com//thumb/5/5b/PGD-BoosterNA.png/139px-PGD-BoosterNA.png
        # extract PGD
        image_name = image_tag["src"].split("-Booster")[0].split("/")[-1]
        file_path = os.path.join(image_folder, f"{image_name}.png")
        save_image(image_url, file_path)
        print(f"Saved {image_name}.png")

if __name__ == "__main__":
    fetch_images_from_yugipedia()
