"""Writes tests/fixtures/reference.json from assets/shape_reference.py, so the TypeScript port
can be checked point by point without Python in CI. Run: python3 scripts/export-reference-fixture.py"""
import json, math, os, sys
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(here, "..", "assets"))
import shape_reference as R

pts, arcs = R.polygon(R.PLACES)
order = sorted(pts, key=lambda k: math.atan2(pts[k][0], -pts[k][1]))
out = {
    "rotation": R.ROT,
    "places": [{"name": k, "lat": v[0], "lon": v[1]} for k, v in R.PLACES.items()],
    "points": {k: list(v) for k, v in pts.items()},
    "order": order,
    "arcs": [list(p) for p in arcs],
}
with open(os.path.join(here, "..", "tests", "fixtures", "reference.json"), "w") as f:
    json.dump(out, f, indent=1)
print("wrote", len(arcs), "arc samples")
