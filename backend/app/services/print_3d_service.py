from typing import Tuple
from app.models.service_request import MaterialType

# Standard material rates per gram in LKR (Sri Lankan Rupee)
MATERIAL_COST_PER_GRAM = {
    MaterialType.PLA: 12.0,    # LKR 12.00 per gram
    MaterialType.PETG: 16.0,   # LKR 16.00 per gram
    MaterialType.ABS: 18.0,    # LKR 18.00 per gram
    MaterialType.TPU: 25.0,    # LKR 25.00 per gram
    MaterialType.RESIN: 35.0,  # LKR 35.00 per gram
}

MACHINE_HOURLY_RATE = 150.0  # LKR 150.00 machine maintenance & electricity per hour
BASE_HANDLING_FEE = 100.0    # LKR 100.00 base prep & bed cleaning fee


def calculate_3d_print_estimate(
    material: MaterialType,
    filament_grams: float,
    print_hours: float,
) -> float:
    """Calculates suggested pricing for student/researcher 3D print jobs."""
    gram_rate = MATERIAL_COST_PER_GRAM.get(material, 15.0)
    material_cost = filament_grams * gram_rate
    machine_cost = print_hours * MACHINE_HOURLY_RATE
    total = BASE_HANDLING_FEE + material_cost + machine_cost
    return round(total, 2)
