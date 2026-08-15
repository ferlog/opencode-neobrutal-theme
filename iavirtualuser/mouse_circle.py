import math
import sys
import time
import ctypes
import ctypes.wintypes

user32 = ctypes.windll.user32

radius = float(sys.argv[1]) if len(sys.argv) > 1 else 150
duration = float(sys.argv[2]) if len(sys.argv) > 2 else 60
period = float(sys.argv[3]) if len(sys.argv) > 3 else 12

def set_pos(x, y):
    user32.SetCursorPos(int(x), int(y))

sw = user32.GetSystemMetrics(0)
sh = user32.GetSystemMetrics(1)

pt = ctypes.wintypes.POINT()
user32.GetCursorPos(ctypes.byref(pt))
cx, cy = float(pt.x), float(pt.y)

start = time.time()
while time.time() - start < duration:
    t = (time.time() - start) % period
    ang = 2.0 * math.pi * (t / period)
    x = cx + radius * math.cos(ang)
    y = cy + radius * math.sin(ang)
    set_pos(x, y)
    time.sleep(0.03)
