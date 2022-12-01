import collections
import json
import dataclasses
import math

import click
import osmium

@dataclasses.dataclass
class Location:
    lat: float
    lon: float

@dataclasses.dataclass
class Node:
    """Some pubs are just nodes, i.e. a single point."""
    location: Location
    name: str | None = None

@dataclasses.dataclass
class Way:
    """Some pubs are represented as ways, which are a list of nodes."""
    name: str
    nodes: list[tuple[float, float]]

    @property
    def centroid(self):
        x = [math.cos(n[0] / 180 * math.pi) * math.cos(n[1] / 180 * math.pi)
             for n in self.nodes]

        y = [math.cos(n[0] / 180 * math.pi) * math.sin(n[1] / 180 * math.pi)
             for n in self.nodes]

        z = [math.sin(n[0] / 180 * math.pi)
             for n in self.nodes]

        avg_x = sum(x) / len(x)
        avg_y = sum(y) / len(y)
        avg_z = sum(z) / len(z)

        lon = math.atan2(avg_y, avg_x) / math.pi * 180
        hyp = math.sqrt(avg_x**2 + avg_y**2)
        lat = math.atan2(avg_z, hyp) / math.pi * 180
        return lat, lon

    def to_node(self):
        return Node(Location(*self.centroid), self.name)

class Handler(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.ways = []
        self.nodes = []

    def node(self, n):
        if n.tags.get("amenity") == "pub":
            loc = n.location.lat, n.location.lon
            node = Node(Location(*loc), n.tags.get("name"))
            self.nodes.append(node)

    def way(self, w):
        if w.tags.get("amenity") == "pub":
            if w.tags.get("name") is None:
                return

            points = [(n.lat, n.lon) for n in w.nodes]
            way = Way(w.tags.get("name"), points)
            self.ways.append(way)


def partition_coords(coords: Location) -> str:
    """Name of the partition in which the coords fall."""
    rlat = math.floor(coords.lat * 100) / 100
    rlon = math.floor(coords.lon * 100) / 100
    return f"{rlat:.2f}x{rlon:.2f}"


@click.command
@click.argument("osm_file", type=click.Path(dir_okay=False, exists=True))
@click.argument("out_dir", type=click.Path(dir_okay=True, file_okay=False, exists=True))
def parse(osm_file: str, out_dir: str) -> None:
    """Extract pubs from an OpenStreetMap file.

    Pubs are written to JSON files, partitioned into 0.01x0.01 square degrees.
    """
    handler = Handler()
    handler.apply_file(osm_file, locations=True)

    all_nodes = handler.nodes + [w.to_node() for w in handler.ways]
    partitioned = collections.defaultdict(list)

    for node in all_nodes:
        key = partition_coords(node.location)
        partitioned[key].append(node)

    for partition, nodes in partitioned.items():
        with open(f"{out_dir}/{partition}.json", "w") as nout:
            json.dump([dataclasses.asdict(n) for n in nodes], nout)


if __name__ == "__main__":
    parse()
