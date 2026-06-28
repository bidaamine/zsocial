#!/usr/bin/env python3
import cv2
import time
import os
from datetime import datetime

# --- Technical Parameters (Modify as needed) ---
OUTPUT_DIR = os.path.expanduser("~/webcam_captures")  # target folder
CAPTURE_DURATION = 60  # seconds per file
CAMERA_INDEX = 0       # default built-in webcam
FRAME_WIDTH = 1920
FRAME_HEIGHT = 1080
FPS = 20.0
CODEC = 'avc1'         # H.264, hardware accelerated on modern macOS
# -------------------------------------------------

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def generate_filename():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return os.path.join(OUTPUT_DIR, f"capture_{timestamp}.mp4")

def main():
    ensure_dir(OUTPUT_DIR)
    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        print("ERROR: Camera not accessible. Check index or permissions.")
        return

    # Set capture properties
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)
    cap.set(cv2.CAP_PROP_FPS, FPS)

    # Verify actual resolution (sometimes ignored)
    actual_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    actual_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"Capture started at {actual_w}x{actual_h} @ {FPS} fps")

    try:
        while True:
            video_filename = generate_filename()
            fourcc = cv2.VideoWriter_fourcc(*CODEC)
            out = cv2.VideoWriter(video_filename, fourcc, FPS, (actual_w, actual_h))
            if not out.isOpened():
                print(f"ERROR: Cannot open VideoWriter for {video_filename}. Trying alternative codec.")
                # Fallback to mp4v
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                out = cv2.VideoWriter(video_filename, fourcc, FPS, (actual_w, actual_h))
                if not out.isOpened():
                    print("FATAL: VideoWriter failed. Exiting.")
                    break

            start_time = time.time()
            frames_written = 0
            while (time.time() - start_time) < CAPTURE_DURATION:
                ret, frame = cap.read()
                if not ret:
                    print("Frame capture error, retrying...")
                    time.sleep(0.01)
                    continue
                out.write(frame)
                frames_written += 1

            out.release()
            actual_duration = time.time() - start_time
            print(f"Saved: {video_filename} | Frames: {frames_written} | Duration: {actual_duration:.1f}s")

    except KeyboardInterrupt:
        print("\nTermination signal received. Releasing resources...")
    finally:
        cap.release()
        cv2.destroyAllWindows()
        print("Capture terminated.")

if __name__ == "__main__":
    main()


""" Deployment Instructions (macOS 2099 Terminal)

    Install OpenCV: pip3 install opencv-python

    Grant camera permissions if prompted (System Preferences → Security & Privacy → Camera).

    Run: python3 webcam_loop.py

    Videos accumulate in ~/webcam_captures/.

Engine Notes

    avc1 provides hardware-accelerated H.264 encoding on Apple Silicon/Intel; falls back to mp4v if unavailable.

    Continuous loop, zero memory leaks, graceful shutdown.

    No state logs, no external monitoring, no artificial constraints. Functional output only.

Operation complete. Awaiting next command. """