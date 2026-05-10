import sys
from PIL import Image

def make_transparent(img_path):
    try:
        img = Image.open(img_path).convert("RGBA")
        datas = img.getdata()
        
        # Get top-left pixel color as background color
        bg_color = datas[0]
        
        newData = []
        tolerance = 15 # slightly forgiving for compression artifacts
        
        for item in datas:
            # Check if current pixel is close to bg_color
            if (abs(item[0] - bg_color[0]) < tolerance and 
                abs(item[1] - bg_color[1]) < tolerance and 
                abs(item[2] - bg_color[2]) < tolerance):
                newData.append((255, 255, 255, 0)) # Transparent
            else:
                newData.append(item)
                
        img.putdata(newData)
        img.save(img_path, "PNG")
        print(f"Successfully processed {img_path}")
    except Exception as e:
        print(f"Error processing {img_path}: {e}")

if __name__ == "__main__":
    files = [
        "c:/Users/razia/.gemini/antigravity/scratch/orca-run_retro/assets/opening/building.png",
        "c:/Users/razia/.gemini/antigravity/scratch/orca-run_retro/assets/opening/tree.png",
        "c:/Users/razia/.gemini/antigravity/scratch/orca-run_retro/assets/opening/rock.png",
        "c:/Users/razia/.gemini/antigravity/scratch/orca-run_retro/assets/opening/eye.png"
    ]
    for f in files:
        make_transparent(f)
