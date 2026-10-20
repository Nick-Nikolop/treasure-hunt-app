"""
Builds the real Kalamata street map used by the "Ο δρόμος" chapter of the explainer video.

Data: © OpenStreetMap contributors (ODbL), fetched from the official OSM API.
Writes:
  public/landing2/explainer/kalamata-map.svg      static street plan in stage units
  components/landing2/explainer/kalamata-map.ts   map box, landmarks and a real walking route

Run: python3 scripts/kalamata-map.py   (re-downloads into /tmp/kalamata-osm if missing)
"""

import heapq
import json
import math
import os
import urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = "/tmp/kalamata-osm"
TILES = {
    "center": "22.1050,37.0300,22.1250,37.0450",
    "north": "22.1050,37.0450,22.1250,37.0500",
}
UA = "TheHuntLanding/1.0 (webmasteerras@gmail.com)"

START_WAY = 552176073  # Πλατεία 23ης Μαρτίου (old town)
TARGET_WAY = 298356181  # Πλατεία Βασιλέως Γεωργίου, the Central Square
CHURCH_WAY = 122898038  # Ιερός Καθεδρικός Ναός Υπαπαντής

WALK_SPAN = 58  # stage units between start and target
INK = "#141414"
PAPER = "#f6f2ea"
BRASS = "#e2b04f"

STREETS = [
    # (highway types, stroke width in stage units, colour, opacity)
    ({"service", "track"}, 0.38, PAPER, 0.85),
    ({"footway", "path", "steps", "cycleway"}, 0.32, PAPER, 0.9),
    ({"residential", "living_street", "unclassified", "pedestrian"}, 0.72, PAPER, 1),
    ({"tertiary", "tertiary_link"}, 1.0, PAPER, 1),
    ({"secondary", "secondary_link"}, 1.3, PAPER, 1),
    ({"primary", "primary_link", "trunk"}, 1.6, PAPER, 1),
]
WALKABLE = set().union(*(types for types, *_ in STREETS))


def load():
    os.makedirs(CACHE, exist_ok=True)
    nodes, ways = {}, {}
    for name, bbox in TILES.items():
        path = os.path.join(CACHE, f"{name}.osm")
        if not os.path.exists(path):
            req = urllib.request.Request(f"https://api.openstreetmap.org/api/0.6/map?bbox={bbox}", headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=120) as res, open(path, "wb") as out:
                out.write(res.read())
        root = ET.parse(path).getroot()
        for n in root.iter("node"):
            nodes[int(n.get("id"))] = (float(n.get("lat")), float(n.get("lon")))
        for w in root.iter("way"):
            ways[int(w.get("id"))] = {
                "nodes": [int(nd.get("ref")) for nd in w.iter("nd")],
                "tags": {t.get("k"): t.get("v") for t in w.iter("tag")},
            }
    return nodes, ways


def centroid(points):
    return (sum(p[0] for p in points) / len(points), sum(p[1] for p in points) / len(points))


def simplify(points, eps):
    if len(points) < 3:
        return points
    (ax, ay), (bx, by) = points[0], points[-1]
    dx, dy = bx - ax, by - ay
    norm = math.hypot(dx, dy) or 1e-9
    worst, index = 0.0, 0
    for i in range(1, len(points) - 1):
        px, py = points[i]
        d = abs(dy * px - dx * py + bx * ay - by * ax) / norm if (dx or dy) else math.hypot(px - ax, py - ay)
        if d > worst:
            worst, index = d, i
    if worst <= eps:
        return [points[0], points[-1]]
    return simplify(points[: index + 1], eps)[:-1] + simplify(points[index:], eps)


def fmt(v):
    s = f"{v:.1f}"
    return "0" if s in ("0.0", "-0.0") else s.rstrip("0").rstrip(".")


def line_d(points, closed=False):
    out = "M" + " ".join(f"{fmt(x)} {fmt(y)}" for x, y in points)
    return out + ("Z" if closed else "")


def main():
    nodes, ways = load()

    start_ll = centroid([nodes[n] for n in ways[START_WAY]["nodes"] if n in nodes])
    target_ll = centroid([nodes[n] for n in ways[TARGET_WAY]["nodes"] if n in nodes])
    lat0 = (start_ll[0] + target_ll[0]) / 2
    lon0 = (start_ll[1] + target_ll[1]) / 2
    kx = math.cos(math.radians(lat0)) * 111320
    ky = 110574

    def meters(ll):
        return ((ll[1] - lon0) * kx, -(ll[0] - lat0) * ky)

    walk_m = math.dist(meters(start_ll), meters(target_ll))
    scale = WALK_SPAN / walk_m

    def stage(ll):
        x, y = meters(ll)
        return (50 + x * scale, 50 + y * scale)

    def way_points(way):
        return [stage(nodes[n]) for n in way["nodes"] if n in nodes]

    # The API returns whole ways, so far-away nodes leak in; frame the requested area only.
    bounds = [tuple(map(float, bbox.split(","))) for bbox in TILES.values()]
    west, south = min(b[0] for b in bounds), min(b[1] for b in bounds)
    east, north = max(b[2] for b in bounds), max(b[3] for b in bounds)
    x0, y0 = stage((north, west))
    x1, y1 = stage((south, east))
    box = (x0, y0, x1, y1)

    # Real walking route on the street graph (Dijkstra, oneway ignored on foot).
    graph = {}
    for way in ways.values():
        if way["tags"].get("highway") not in WALKABLE:
            continue
        pts = [n for n in way["nodes"] if n in nodes]
        bias = 0.9 if way["tags"].get("highway") in {"pedestrian", "footway", "living_street"} else 1.0
        for a, b in zip(pts, pts[1:]):
            d = math.dist(meters(nodes[a]), meters(nodes[b])) * bias
            graph.setdefault(a, []).append((b, d))
            graph.setdefault(b, []).append((a, d))

    def nearest(ll):
        target = meters(ll)
        return min(graph, key=lambda n: math.dist(meters(nodes[n]), target))

    source, goal = nearest(start_ll), nearest(target_ll)
    dist, prev, queue = {source: 0.0}, {}, [(0.0, source)]
    while queue:
        d, n = heapq.heappop(queue)
        if n == goal:
            break
        if d > dist.get(n, math.inf):
            continue
        for m, w in graph[n]:
            nd = d + w
            if nd < dist.get(m, math.inf):
                dist[m], prev[m] = nd, n
                heapq.heappush(queue, (nd, m))
    route_nodes = [goal]
    while route_nodes[-1] != source:
        route_nodes.append(prev[route_nodes[-1]])
    route_nodes.reverse()
    route = simplify([stage(nodes[n]) for n in route_nodes], 0.12)
    route_length_m = sum(
        math.dist(meters(nodes[a]), meters(nodes[b])) for a, b in zip(route_nodes, route_nodes[1:])
    )

    # Name the street the walk spends longest on, labelled along its longest straight run.
    edge_name = {}
    for way in ways.values():
        name = way["tags"].get("name")
        if not name or way["tags"].get("highway") not in WALKABLE:
            continue
        pts = way["nodes"]
        for a, b in zip(pts, pts[1:]):
            edge_name[(a, b)] = edge_name[(b, a)] = name
    per_name, best_edge = {}, {}
    for a, b in zip(route_nodes, route_nodes[1:]):
        name = edge_name.get((a, b))
        if not name:
            continue
        length = math.dist(meters(nodes[a]), meters(nodes[b]))
        per_name[name] = per_name.get(name, 0) + length
        if length > best_edge.get(name, (0, None))[0]:
            best_edge[name] = (length, (a, b))
    street = max(per_name, key=per_name.get)
    sa, sb = (stage(nodes[n]) for n in best_edge[street][1])
    street_at = ((sa[0] + sb[0]) / 2, (sa[1] + sb[1]) / 2)
    street_angle = math.degrees(math.atan2(sb[1] - sa[1], sb[0] - sa[0]))
    if street_angle > 90:
        street_angle -= 180
    elif street_angle < -90:
        street_angle += 180

    # Static plan.
    layers = []
    layers.append(
        f'<rect x="{fmt(box[0])}" y="{fmt(box[1])}" width="{fmt(box[2] - box[0])}" height="{fmt(box[3] - box[1])}" fill="{INK}" fill-opacity="0.075"/>'
    )

    areas = {"park": [], "square": [], "water": [], "castle": []}
    rivers, rails = [], []
    for way in ways.values():
        tags = way["tags"]
        pts = way_points(way)
        if len(pts) < 2:
            continue
        closed = way["nodes"][0] == way["nodes"][-1]
        if closed and (tags.get("leisure") in {"park", "garden", "pitch"} or tags.get("landuse") in {"grass", "orchard", "recreation_ground"}):
            areas["park"].append(line_d(simplify(pts, 0.15), True))
        elif closed and (tags.get("place") == "square" or (tags.get("highway") == "pedestrian" and tags.get("area") == "yes")):
            areas["square"].append(line_d(simplify(pts, 0.1), True))
        elif closed and tags.get("natural") == "water":
            areas["water"].append(line_d(simplify(pts, 0.15), True))
        elif closed and tags.get("historic") in {"castle", "fort"}:
            areas["castle"].append(line_d(simplify(pts, 0.1), True))
        if tags.get("waterway") in {"river", "stream", "canal"}:
            rivers.append(line_d(simplify(pts, 0.2)))
        if tags.get("railway") in {"rail", "narrow_gauge", "disused", "abandoned"}:
            rails.append(line_d(simplify(pts, 0.2)))

    if areas["park"]:
        layers.append(f'<path d="{" ".join(areas["park"])}" fill="{BRASS}" fill-opacity="0.28"/>')
    if areas["water"]:
        layers.append(f'<path d="{" ".join(areas["water"])}" fill="{INK}" fill-opacity="0.14"/>')
    if rivers:
        layers.append(
            f'<path d="{" ".join(rivers)}" fill="none" stroke="{INK}" stroke-opacity="0.13" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'
        )
    if areas["castle"]:
        layers.append(
            f'<path d="{" ".join(areas["castle"])}" fill="{INK}" fill-opacity="0.16" stroke="{INK}" stroke-opacity="0.35" stroke-width="0.35"/>'
        )

    for types, width, colour, opacity in STREETS:
        ds = [
            line_d(simplify(way_points(way), 0.12))
            for way in ways.values()
            if way["tags"].get("highway") in types
            and not (way["tags"].get("area") == "yes")
            and len(way_points(way)) >= 2
        ]
        if ds:
            layers.append(
                f'<path d="{" ".join(ds)}" fill="none" stroke="{colour}" stroke-opacity="{opacity}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>'
            )

    if areas["square"]:
        layers.append(f'<path d="{" ".join(areas["square"])}" fill="{BRASS}" fill-opacity="0.45"/>')
    if rails:
        layers.append(
            f'<path d="{" ".join(rails)}" fill="none" stroke="{INK}" stroke-opacity="0.32" stroke-width="0.3" stroke-dasharray="0.9 0.6"/>'
        )

    w, h = box[2] - box[0], box[3] - box[1]
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{fmt(box[0])} {fmt(box[1])} {fmt(w)} {fmt(h)}" '
        f'width="{round(w * 16)}" height="{round(h * 16)}">'
        f"<!-- Kalamata street plan. Data © OpenStreetMap contributors, ODbL. -->"
        + "".join(layers)
        + "</svg>"
    )
    svg_path = os.path.join(ROOT, "public/landing2/explainer/kalamata-map.svg")
    os.makedirs(os.path.dirname(svg_path), exist_ok=True)
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg)

    castle_ways = [way for way in ways.values() if way["tags"].get("historic") in {"castle", "fort"}]
    castle = centroid(way_points(castle_ways[0])) if castle_ways else stage(start_ll)
    church = centroid(way_points(ways[CHURCH_WAY]))

    def pt(p):
        return f"[{fmt(p[0])}, {fmt(p[1])}]"

    ts = f"""/**
 * Real street plan of central Kalamata, generated by scripts/kalamata-map.py.
 * Data © OpenStreetMap contributors (ODbL). Coordinates are explainer stage units.
 */

type Pt = [number, number]

/** Where public/landing2/explainer/kalamata-map.svg sits on the stage: x, y, width, height. */
export const MAP_BOX = [{fmt(box[0])}, {fmt(box[1])}, {fmt(w)}, {fmt(h)}] as const

/** Πλατεία 23ης Μαρτίου, in the old town. */
export const MAP_START: Pt = {pt(stage(start_ll))}
/** Πλατεία Βασιλέως Γεωργίου, the Central Square. */
export const MAP_TARGET: Pt = {pt(stage(target_ll))}
export const MAP_CASTLE: Pt = {pt(castle)}
/** Ιερός Καθεδρικός Ναός Υπαπαντής. */
export const MAP_CHURCH: Pt = {pt(church)}

/** The street the walk mostly follows, with a label point and its angle in degrees. */
export const MAP_STREET = {{ name: {json.dumps(street, ensure_ascii=False)}, at: {pt(street_at)} as Pt, angle: {round(street_angle)} }}

/** Shortest walk between the two squares on the real street graph (about {round(route_length_m)} m). */
export const MAP_ROUTE: Pt[] = [{", ".join(pt(p) for p in route)}]
"""
    ts_path = os.path.join(ROOT, "components/landing2/explainer/kalamata-map.ts")
    with open(ts_path, "w", encoding="utf-8") as f:
        f.write(ts)

    print(json.dumps({
        "walk_m_straight": round(walk_m),
        "route_m": round(route_length_m),
        "route_points": len(route),
        "scale_units_per_m": round(scale, 4),
        "box": [round(v, 1) for v in box],
        "svg_kb": round(len(svg) / 1024, 1),
        "start": [round(v, 1) for v in stage(start_ll)],
        "target": [round(v, 1) for v in stage(target_ll)],
        "castle": [round(v, 1) for v in castle],
        "church": [round(v, 1) for v in church],
        "streets_m": {k: round(v) for k, v in sorted(per_name.items(), key=lambda kv: -kv[1])},
    }, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
