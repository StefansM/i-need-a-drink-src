# i-need-a-drink

These scripts generate the source and content of
https://stefansm.github.io/i-need-a-drink/, which lists all pubs within 1km of
the user (currently limited to just the Greater London area).

## Strategy

Using data from [OpenStreetMap], extract a list of all pubs. The pubs are
written to JSON files partitioned into 0.01° by 0.01° latitude/longitude bins.
Nearby partitioned files are scanned from Javascript and displayed to the user.

## Usage

Install using poetry:

```
git clone https://github.com/StefansM/i-need-a-drink-src/
cd i-need-a-drink-src
poetry install
```

Generate partitioned JSON files. In this example, the file
`greater-london-latest.osm.pbf` is downloaded from [Geofabrik].

```
mkdir i-need-a-drink/public/partitions
poetry run python -mpubs \
    ~/Downloads/greater-london-latest.osm.pbf \
    i-need-a-drink/public/partitions
```

Deploy web application to Github Pages.

```
cd i-need-a-drink
npm install
./deploy.sh
```


[OpenStreetMap]: https://www.openstreetmap.org
[Geofabrik]: https://download.geofabrik.de/europe/great-britain/england/greater-london.html
