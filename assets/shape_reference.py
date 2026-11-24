"""Reference for the shape maths. Standalone: run `python3 shape_reference.py` to write shape_sample.svg.
Port this to TypeScript (lib/shape). The sample places below are test data, not real couples."""
import json, math, os
D = math.pi / 180
ROT = -43  # degrees added to longitude before projecting

PLACES = {"Goa": (15.45, 73.80), "Langkawi": (6.35, 99.80), "Yellowstone": (44.46, -110.83),
          "Valiyaparamba": (12.20, 75.15), "Vienna": (48.21, 16.37), "Barcelona": (41.39, 2.17),
          "Seville": (37.39, -5.99), "Portimao": (36.9, -8.54), "Wayanad": (11.69, 76.08),
          "Portland": (45.52, -122.68), "California": (37.35, -121.95), "Sri Lanka": (6.90, 80.00)}

def vec(lat, lon):
    return (math.cos(lat*D)*math.cos(lon*D), math.cos(lat*D)*math.sin(lon*D), math.sin(lat*D))
def dot(a, b): return sum(i*j for i, j in zip(a, b))
def angle(a, b): return math.acos(max(-1, min(1, dot(a, b))))
def slerp(a, b, t):
    om = angle(a, b)
    if om < 1e-9: return a
    s = math.sin(om)
    return tuple(a[i]*math.sin((1-t)*om)/s + b[i]*math.sin(t*om)/s for i in range(3))
def project(v):
    n = math.sqrt(dot(v, v)); v = tuple(c/n for c in v)
    lat = math.asin(max(-1, min(1, v[2])))/D
    lon = math.atan2(v[1], v[0])/D + ROT
    r = (90-lat)/90; t = lon*D
    return (r*math.sin(t), -r*math.cos(t))

def polygon(places):
    """Places sorted by angle around the pole, joined (closed) by great-circle arcs.
    Returns (points_on_chart, arc_polyline). Merge places within ~50 km before calling."""
    pts = {k: project(vec(*v)) for k, v in places.items()}
    order = sorted(pts, key=lambda k: math.atan2(pts[k][0], -pts[k][1]))
    arcs = []
    for i, a in enumerate(order):
        b = order[(i+1) % len(order)]
        va, vb = vec(*places[a]), vec(*places[b])
        arcs += [project(slerp(va, vb, j/12)) for j in range(13)]
    return pts, arcs

if __name__ == "__main__":
    W = H = 1000
    pts, arcs = polygon(PLACES)
    xs = [p[0] for p in pts.values()]; ys = [p[1] for p in pts.values()]
    bx, by = (min(xs)+max(xs))/2, (min(ys)+max(ys))/2
    far = max(math.hypot(p[0]-bx, p[1]-by) for p in pts.values())
    s = (W/2 - 70)/far
    T = lambda p: (W/2 + (p[0]-bx)*s, H/2 + (p[1]-by)*s)
    here = os.path.dirname(os.path.abspath(__file__))
    land = json.load(open(os.path.join(here, "world-land-dots.json")))["land"]
    dots = "".join("M%.1f %.1fh0" % T(p) for p in land)
    d = "M" + " L".join("%.1f %.1f" % T(p) for p in arcs) + " Z"
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d"><rect width="100%%" height="100%%" fill="#05050A"/>'
           '<path d="%s" stroke="#F4F0E8" stroke-opacity=".22" stroke-width="3.6" stroke-linecap="round" fill="none"/>'
           '<path d="%s" fill="#FF2E7E" fill-opacity=".10" stroke="#FF2E7E" stroke-width="2.8" stroke-linejoin="round"/>%s</svg>'
           % (W, H, dots, d, "".join('<circle cx="%.1f" cy="%.1f" r="6" fill="#fff"/>' % T(p) for p in pts.values())))
    open("shape_sample.svg", "w").write(svg); print("wrote shape_sample.svg")
