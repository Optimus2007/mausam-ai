import os

os.environ["OPENWEATHER_API_KEY"] = ""  # force demo mode for API tests
os.environ["RATE_LIMIT_PER_MINUTE"] = "0"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)

CHANDIGARH = {"lat": 30.7333, "lon": 76.7794, "name": "Chandigarh", "country": "IN"}
DELHI = {"lat": 28.6139, "lon": 77.2090, "name": "New Delhi", "country": "IN"}


def test_health_reports_demo_mode():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["mode"] == "demo"


def test_weather_is_labelled_demo():
    r = client.get("/api/weather", params=CHANDIGARH)
    assert r.status_code == 200
    body = r.json()
    assert body["meta"]["source"] == "demo"
    assert body["hourly"][0]["is_now"] is True
    assert len(body["hourly"]) >= 24
    assert body["current"]["wind_dir"] == "NW"


def test_weather_validates_coordinates():
    r = client.get("/api/weather", params={"lat": 123, "lon": 0})
    assert r.status_code == 422


def test_geocode_validates_query():
    assert client.get("/api/geocode", params={"q": "a"}).status_code == 422
    r = client.get("/api/geocode", params={"q": "delhi"})
    assert r.status_code == 200 and r.json()[0]["name"] == "New Delhi"


def test_recommendations_shape_and_preferences():
    body = {**CHANDIGARH, "preferences": {"focus_activity": "gardening", "preferred_times": ["evening"]}}
    r = client.post("/api/recommendations", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["focus"]["activity"] == "gardening"
    assert {a["id"] for a in data["activities"]} == {"fitness", "travel", "gardening", "family"}
    assert all(0 <= a["score"] <= 100 for a in data["activities"])
    assert data["advisories"], "at least one advisory (or the all-clear) is always returned"
    # Chandigarh demo scenario has rain from 9 PM local time
    assert any(a["kind"] == "rain" for a in data["advisories"])


def test_recommendations_rejects_unknown_activity():
    r = client.post("/api/recommendations", json={**CHANDIGARH, "preferences": {"focus_activity": "skydiving"}})
    assert r.status_code == 422


def test_planner_new_delhi():
    r = client.post("/api/planner", json=DELHI)
    assert r.status_code == 200
    data = r.json()
    assert [c["id"] for c in data["cards"]] == ["heritage", "nature"]
    assert data["destination"]["landmark"] == "india_gate"
    assert data["insights"]["route"]["name"] == "Yamuna Expressway"
    assert len(data["insights"]["route"]["segments"]) == 3
    assert data["insights"]["accessibility"]["site"] == "Qutub Minar"
    assert data["indoor_alternatives"]["items"]


def test_planner_generic_city():
    r = client.post("/api/planner", json={"lat": 51.5072, "lon": -0.1276, "name": "London"})
    assert r.status_code == 200
    data = r.json()
    assert data["insights"]["route"] is None
    assert data["destination"]["curated"] is False


def test_unknown_api_route_is_json_404():
    r = client.get("/api/nope")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "not_found"
