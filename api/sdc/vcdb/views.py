from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def version(request):
    return Response("2024.1")


@api_view(["GET"])
def year_range(request):
    return Response({"minYear": 2010, "maxYear": 2025})


@api_view(["GET"])
def configurations(request):
    sample_configs = [
        {"id": "cfg-1001", "vehicleId": "VH-2025-ACURA-ADX", "baseVehicleId": "BV-2025-ACURA-ADX", "year": 2025, "make": "Acura", "model": "ADX", "submodel": "Advance", "driveType": "AWD", "fuelType": "Gas", "numDoors": 4, "bodyType": "Crossover"},
        {"id": "cfg-1002", "vehicleId": "VH-2024-ACURA-ADX", "baseVehicleId": "BV-2024-ACURA-ADX", "year": 2024, "make": "Acura", "model": "ADX", "submodel": "Advance", "driveType": "AWD", "fuelType": "Gas", "numDoors": 4, "bodyType": "Crossover"},
        {"id": "cfg-1003", "vehicleId": "VH-2024-TOYOTA-RAV4", "baseVehicleId": "BV-2024-TOYOTA-RAV4", "year": 2024, "make": "Toyota", "model": "RAV4", "submodel": "XLE", "driveType": "AWD", "fuelType": "Gas", "numDoors": 4, "bodyType": "Crossover"},
        {"id": "cfg-1004", "vehicleId": "VH-2023-FORD-F150", "baseVehicleId": "BV-2023-FORD-F150", "year": 2023, "make": "Ford", "model": "F-150", "submodel": "XLT", "driveType": "4WD", "fuelType": "Gas", "numDoors": 4, "bodyType": "Truck"},
        {"id": "cfg-1005", "vehicleId": "VH-2023-HONDA-CIVIC", "baseVehicleId": "BV-2023-HONDA-CIVIC", "year": 2023, "make": "Honda", "model": "Civic", "submodel": "Si", "driveType": "FWD", "fuelType": "Gas", "numDoors": 4, "bodyType": "Sedan"},
    ]
    qp = request.query_params

    def norm(s: str | None) -> str | None:
        if s is None:
            return None
        s = s.strip()
        return s.lower() if s != "" else None

    year_from = qp.get("yearFrom")
    year_to = qp.get("yearTo")
    make = norm(qp.get("make"))
    model = norm(qp.get("model"))
    submodel = norm(qp.get("submodel"))
    drive_type = norm(qp.get("driveType"))
    fuel_type = norm(qp.get("fuelType"))
    body_type = norm(qp.get("bodyType"))
    num_doors = qp.get("numDoors")

    try:
        yf = int(year_from) if year_from not in (None, "") else None
    except ValueError:
        yf = None
    try:
        yt = int(year_to) if year_to not in (None, "") else None
    except ValueError:
        yt = None
    try:
        nd = int(num_doors) if num_doors not in (None, "") else None
    except ValueError:
        nd = None

    def matches(cfg: dict) -> bool:
        if yf is not None and cfg["year"] < yf:
            return False
        if yt is not None and cfg["year"] > yt:
            return False
        if make is not None and cfg["make"].lower() != make:
            return False
        if model is not None and cfg["model"].lower() != model:
            return False
        if submodel is not None and cfg["submodel"].lower() != submodel:
            return False
        if drive_type is not None and cfg["driveType"].lower() != drive_type:
            return False
        if fuel_type is not None and cfg["fuelType"].lower() != fuel_type:
            return False
        if body_type is not None and cfg["bodyType"].lower() != body_type:
            return False
        if nd is not None and cfg["numDoors"] != nd:
            return False
        return True

    filtered = [c for c in sample_configs if matches(c)]
    return Response({"configurations": filtered, "totalCount": len(filtered)})


