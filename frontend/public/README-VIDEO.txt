Put your 3D dish video here and name it:  hero.mp4

Until then the site shows a built-in 3D plate animation that reacts to scroll.

For smooth scroll-scrubbing, export the video with a keyframe on every frame:
  ffmpeg -i dish.mp4 -an -vf "scale=1280:-2" -c:v libx264 -g 1 -crf 23 -movflags +faststart hero.mp4
Keep it 5-8 seconds long and under ~8 MB. Mobile browsers handle short clips best.
