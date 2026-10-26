"""Curated destination catalog used by the Destination Planner.

Weather is always fetched live (or from demo data); this file only describes *places*:
which attractions are open-air, which are indoor, and which driving route to check.
Cities not in the catalog get a generic plan built from the destination's own weather.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from ..schemas import Location


@dataclass(frozen=True)
class Place:
    name: str
    note: str
    lat: float
    lon: float


@dataclass(frozen=True)
class Indoor:
    name: str
    kind: str
    note: str


@dataclass(frozen=True)
class Destination:
    key: str
    lat: float
    lon: float
    tagline: str
    landmark: str  # header illustration key understood by the frontend
    heritage_title: str
    heritage_subtitle: str
    heritage: list[Place]
    nature_title: str
    nature_subtitle: str
    nature: list[Place]
    indoor: list[Indoor]
    route_name: str | None = None
    route_label: str | None = None
    route: list[Place] = field(default_factory=list)
    access_site: Place | None = None
    aliases: tuple[str, ...] = ()


P = Place
I = Indoor

CATALOG: list[Destination] = [
    Destination(
        key="new delhi", lat=28.6139, lon=77.2090, aliases=("delhi",),
        tagline="Historical Sights & Views", landmark="india_gate",
        heritage_title="Historical Monuments", heritage_subtitle="Open-air sites like Red Fort",
        heritage=[
            P("Red Fort", "Mughal fort, UNESCO World Heritage Site", 28.6562, 77.2410),
            P("Qutub Minar", "73 m minaret and ruins complex", 28.5245, 77.1855),
            P("Humayun's Tomb", "Garden tomb, precursor to the Taj", 28.5933, 77.2507),
            P("India Gate", "War memorial on Kartavya Path", 28.6129, 77.2295),
        ],
        nature_title="Mountain View Points", nature_subtitle="Nearby hills/scenic spots",
        nature=[
            P("Aravalli Biodiversity Park", "Ridge trails and city views", 28.5396, 77.1574),
            P("Asola Bhatti Wildlife Sanctuary", "Aravalli scrub forest and lakes", 28.4766, 77.2297),
            P("Sanjay Van", "Forested ridge with ruins", 28.5287, 77.1747),
            P("Lodhi Garden", "Landscaped garden with tombs", 28.5931, 77.2197),
        ],
        indoor=[
            I("National Museum", "Museum", "5,000 years of Indian art and artefacts"),
            I("Pradhanmantri Sangrahalaya", "Museum", "Interactive galleries on India's Prime Ministers"),
            I("National Gallery of Modern Art", "Art gallery", "Modern and contemporary Indian art"),
            I("National Science Centre", "Science centre", "Hands-on exhibits — good for families"),
            I("National Crafts Museum", "Museum", "Textiles, crafts and live artisan demos"),
        ],
        route_name="Yamuna Expressway", route_label="to Agra",
        route=[
            P("Greater Noida", "Expressway start", 28.4744, 77.5040),
            P("Mathura", "Midway", 27.4924, 77.6737),
            P("Agra", "Destination", 27.1767, 78.0081),
        ],
        access_site=P("Qutub Minar", "Open-air monument", 28.5245, 77.1855),
    ),
    Destination(
        key="chandigarh", lat=30.7333, lon=76.7794,
        tagline="Gardens, Lakes & Hill Views", landmark="open_hand",
        heritage_title="Heritage & Landmarks", heritage_subtitle="Open-air sites like Rock Garden",
        heritage=[
            P("Rock Garden", "Nek Chand's sculpture garden", 30.7525, 76.8101),
            P("Capitol Complex", "Le Corbusier's UNESCO-listed complex", 30.7590, 76.8040),
            P("Open Hand Monument", "Icon of the city", 30.7590, 76.8058),
            P("Zakir Hussain Rose Garden", "Asia's largest rose garden", 30.7461, 76.7820),
        ],
        nature_title="Hill View Points", nature_subtitle="Sukhna Lake, Morni Hills & Kasauli",
        nature=[
            P("Sukhna Lake", "Lakeside promenade with Shivalik views", 30.7421, 76.8188),
            P("Morni Hills", "Shivalik hill station, 45 km", 30.6950, 77.0870),
            P("Kasauli", "Hill town viewpoints, 60 km", 30.8989, 76.9655),
        ],
        indoor=[
            I("Government Museum & Art Gallery", "Museum", "Gandharan sculpture and miniature paintings"),
            I("Le Corbusier Centre", "Museum", "The story of planning Chandigarh"),
            I("Pierre Jeanneret Museum", "Museum", "Furniture and design archives"),
            I("International Dolls Museum", "Museum", "Small, family-friendly collection"),
            I("Elante Mall", "Shopping", "Food court, cinema and play zones"),
        ],
        route_name="Chandigarh–Shimla Highway (NH5)", route_label="to Shimla",
        route=[
            P("Parwanoo", "Hills begin", 30.8374, 76.9621),
            P("Solan", "Midway", 30.9045, 77.0967),
            P("Shimla", "Destination", 31.1048, 77.1734),
        ],
        access_site=P("Rock Garden", "Open-air sculpture garden", 30.7525, 76.8101),
    ),
    Destination(
        key="jaipur", lat=26.9124, lon=75.7873,
        tagline="Forts, Palaces & Ridge Views", landmark="fort",
        heritage_title="Forts & Palaces", heritage_subtitle="Open-air sites like Amber Fort",
        heritage=[
            P("Amber Fort", "Hilltop fort-palace", 26.9855, 75.8513),
            P("Hawa Mahal", "Palace of Winds façade", 26.9239, 75.8267),
            P("City Palace", "Royal residence and courtyards", 26.9258, 75.8237),
            P("Jantar Mantar", "Open-air astronomical instruments", 26.9248, 75.8246),
        ],
        nature_title="Hill Fort View Points", nature_subtitle="Nahargarh & Aravalli ridges",
        nature=[
            P("Nahargarh Fort", "Sunset views over the city", 26.9374, 75.8155),
            P("Jaigarh Fort", "Ridge-top ramparts", 26.9851, 75.8456),
            P("Jal Mahal", "Lake palace viewpoint", 26.9535, 75.8463),
        ],
        indoor=[
            I("Albert Hall Museum", "Museum", "Indo-Saracenic museum with Egyptian mummy"),
            I("Anokhi Museum of Hand Printing", "Museum", "Block-printing demos"),
            I("Jawahar Kala Kendra", "Arts centre", "Exhibitions and performances"),
            I("World Trade Park", "Shopping", "Large indoor mall"),
        ],
        route_name="Delhi–Jaipur Highway (NH48)", route_label="to Delhi",
        route=[
            P("Shahpura", "Early stretch", 27.3880, 75.9590),
            P("Neemrana", "Midway", 27.9886, 76.3866),
            P("Gurugram", "Destination", 28.4595, 77.0266),
        ],
        access_site=P("Amber Fort", "Hilltop fort, ramp and steps", 26.9855, 75.8513),
    ),
    Destination(
        key="mumbai", lat=19.0760, lon=72.8777, aliases=("bombay",),
        tagline="Heritage, Sea Views & Islands", landmark="gateway",
        heritage_title="Heritage Landmarks", heritage_subtitle="Open-air sites like Gateway of India",
        heritage=[
            P("Gateway of India", "Waterfront arch monument", 18.9220, 72.8347),
            P("Chhatrapati Shivaji Terminus", "Gothic railway station, UNESCO", 18.9398, 72.8355),
            P("Elephanta Caves", "Rock-cut caves, ferry ride", 18.9633, 72.9315),
            P("Haji Ali Dargah", "Shrine on a causeway", 18.9827, 72.8089),
        ],
        nature_title="Coastal & Hill View Points", nature_subtitle="Marine Drive, Sanjay Gandhi NP",
        nature=[
            P("Marine Drive", "Queen's Necklace promenade", 18.9440, 72.8235),
            P("Sanjay Gandhi National Park", "Forest trails and Kanheri caves", 19.2147, 72.9106),
            P("Bandstand Promenade", "Sea-facing walkway", 19.0466, 72.8196),
        ],
        indoor=[
            I("Chhatrapati Shivaji Maharaj Vastu Sangrahalaya", "Museum", "Art, archaeology and natural history"),
            I("Dr. Bhau Daji Lad Museum", "Museum", "City's oldest museum"),
            I("Nehru Science Centre", "Science centre", "Interactive exhibits"),
            I("Jehangir Art Gallery", "Art gallery", "Contemporary Indian art"),
        ],
        route_name="Mumbai–Pune Expressway", route_label="to Pune",
        route=[
            P("Panvel", "Expressway start", 18.9894, 73.1175),
            P("Lonavala", "Ghat section", 18.7546, 73.4062),
            P("Pune", "Destination", 18.5204, 73.8567),
        ],
        access_site=P("Elephanta Caves", "Ferry-dependent island site", 18.9633, 72.9315),
    ),
    Destination(
        key="agra", lat=27.1767, lon=78.0081,
        tagline="Mughal Monuments & River Views", landmark="taj",
        heritage_title="Mughal Monuments", heritage_subtitle="Open-air sites like the Taj Mahal",
        heritage=[
            P("Taj Mahal", "Marble mausoleum, UNESCO World Heritage Site", 27.1751, 78.0421),
            P("Agra Fort", "Red sandstone Mughal fort", 27.1795, 78.0211),
            P("Itimad-ud-Daulah", "The 'Baby Taj'", 27.1929, 78.0311),
            P("Fatehpur Sikri", "Abandoned Mughal capital, 40 km", 27.0945, 77.6679),
        ],
        nature_title="Riverside View Points", nature_subtitle="Mehtab Bagh & Yamuna banks",
        nature=[
            P("Mehtab Bagh", "Taj views across the Yamuna", 27.1797, 78.0413),
            P("Sur Sarovar (Keetham Lake)", "Bird sanctuary lake", 27.2527, 77.8507),
        ],
        indoor=[
            I("Taj Museum", "Museum", "Inside the Taj complex — Mughal artefacts"),
            I("Kalakriti Cultural Centre", "Theatre", "'Mohabbat the Taj' live show"),
            I("Marble inlay workshops", "Craft studio", "Watch pietra dura artisans at work"),
        ],
        route_name="Yamuna Expressway", route_label="to Delhi",
        route=[
            P("Mathura", "Early stretch", 27.4924, 77.6737),
            P("Greater Noida", "Expressway end", 28.4744, 77.5040),
            P("New Delhi", "Destination", 28.6139, 77.2090),
        ],
        access_site=P("Taj Mahal", "Open-air monument", 27.1751, 78.0421),
    ),
]


def find(location: Location) -> Destination | None:
    name = (location.name or "").strip().lower()
    for d in CATALOG:
        if name == d.key or name in d.aliases:
            return d
    for d in CATALOG:
        if abs(d.lat - location.lat) < 0.3 and abs(d.lon - location.lon) < 0.3:
            return d
    return None


def generic(location: Location) -> Destination:
    city = location.name or "this destination"
    return Destination(
        key=city.lower(), lat=location.lat, lon=location.lon,
        tagline="Sights & Outdoor Spots", landmark="skyline",
        heritage_title="Historical & Cultural Sites", heritage_subtitle=f"Open-air landmarks in {city}",
        heritage=[],
        nature_title="Viewpoints & Nature", nature_subtitle=f"Parks, lakes & scenic spots near {city}",
        nature=[],
        indoor=[
            I("Local museums & galleries", "Museum", "Check opening hours before you go"),
            I("Science or heritage centres", "Exhibition", "Good for families"),
            I("Malls & food courts", "Shopping", "Covered, climate-controlled"),
            I("Indoor sports & gaming", "Recreation", "Bowling, climbing, trampoline parks"),
        ],
        access_site=Place(f"Outdoor attractions in {city}", "City-centre forecast", location.lat, location.lon),
    )
