# RideBuddy

A map of bike parks in Switzerland, Austria, Germany and Italy. School Passion Project by Albert.

## Files

| File | What it does |
|---|---|
| index.html | The structure of the page |
| style.css | Colours, fonts and the phone layout |
| app.js | Loads the parks, draws the map, filters, search and "Near me" |
| parks.json | The list of bike parks (add new parks here) |
| logo.svg | The logo, also used as the browser tab icon |

## Add a park

Copy one park in parks.json, paste it after a comma and change the details:

```json
{"name": "Name", "town": "Town", "country": "CH", "lat": 46.00, "lng": 8.95,
 "features": ["lift", "jumps", "flow", "pumptrack"], "season": "May to October", "website": "https://..."}
```

Coordinates: right click the place in Google Maps and click the numbers to copy them.

## Test on your computer

parks.json cannot load if you double click index.html. Use the "Live Server" extension in Visual Studio Code, or test on GitHub Pages.

## Data

The parks in parks.json are sample data. Check every park (position, features, season, website) before publishing.

Map tiles © Esri.
