import requests
import json
import time
import os

# NASA EONET API categories
categories = [
    "severeStorms",
    "floods", 
    "severeStorms",
    "drought",
    "wildfires"
]

base_url = "https://eonet.gsfc.nasa.gov/api/v3/events"
days = 2
all_events = {}

# Add headers for better API compatibility
headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; EventsFetcher/1.0)'
}

for cat in categories:
    url = f"{base_url}?category={cat}&days={days}"
    print(f"Fetching: {url}")
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        
        # Check if request was successful
        if response.status_code != 200:
            print(f"❌ Error {response.status_code} for {cat}")
            all_events[cat] = []
            continue
            
        # Parse JSON response
        data = response.json()
        events = data.get("events", [])
        all_events[cat] = events
        print(f"✅ Found {len(events)} events for {cat}")
        
        # Add small delay between requests to be respectful to the API
        time.sleep(0.5)
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed for {cat}: {e}")
        all_events[cat] = []
    except json.JSONDecodeError as e:
        print(f"❌ JSON decode failed for {cat}: {e}")
        print("Raw response:", response.text[:200])
        all_events[cat] = []
    except Exception as e:
        print(f"❌ Unexpected error for {cat}: {e}")
        all_events[cat] = []

output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'coastal_events_last24h.json')
# Save results
try:
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_events, f, indent=4, ensure_ascii=False)
    print(f"✅ Done, saved to {output_path}")
    # ... rest of the code
except Exception as e:
    print(f"❌ Failed to save file: {e}")
    
except Exception as e:
    print(f"❌ Failed to save file: {e}")