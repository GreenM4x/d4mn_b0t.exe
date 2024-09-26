import requests
import json
import time

def check_youtube_video_status(video_url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:92.0) Gecko/20100101 Firefox/92.0'
    }
    
    try:
        response = requests.get(video_url, headers=headers)
        
        if response.status_code == 200:
            page_content = response.text
            
            if "Video ist nicht mehr verfügbar" in page_content:
                return "unavailable"
            elif "ist privat" in page_content:
                return "private"
            else:
                return "available"
        else:
            return "error"
    
    except requests.exceptions.RequestException as e:
        print(f"An error occurred: {e}")
        return "error"

def filter_videos(json_data):
    available_videos = []
    total_videos = len(json_data)

    for index, video in enumerate(json_data):
        video_status = check_youtube_video_status(video['url'])

        # Provide feedback on progress
        print(f"Processing {index + 1}/{total_videos}: {video['title']} - Status: {video_status}")
        
        if video_status == "available":
            available_videos.append(video)

        time.sleep(0.1) 
    
    return available_videos

with open('3k-songs', 'r', encoding='utf-8') as file:
    json_data = json.load(file)

filtered_videos = filter_videos(json_data)

with open('available_videos.json', 'w', encoding='utf-8') as json_file:
    json.dump(filtered_videos, json_file, indent=4, ensure_ascii=False)

print(f"Filtered videos saved to 'available_videos.json'. Total available videos: {len(filtered_videos)}")
