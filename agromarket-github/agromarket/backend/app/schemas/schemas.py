from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Role = Literal["farmer", "buyer", "driver", "coordinator"]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --------------------------------------------------------------------------- #
# Auth
# --------------------------------------------------------------------------- #


class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Email or phone number")
    password: str = Field(min_length=6)


class TokenResponse(ORMModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(ORMModel):
    id: int
    full_name: str
    email: str
    phone: str
    role: str
    status: str
    is_active: bool


class FarmerRegister(BaseModel):
    role: Literal["farmer"]
    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=10, max_length=15)
    email: EmailStr
    village: str = Field(min_length=2, max_length=80)
    district: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=6)


class BuyerRegister(BaseModel):
    role: Literal["buyer"]
    full_name: str = Field(min_length=2, max_length=120)
    business_name: str = Field(min_length=2, max_length=160)
    business_type: str = Field(min_length=2, max_length=60)
    phone: str = Field(min_length=10, max_length=15)
    email: EmailStr
    business_address: str = Field(min_length=5)
    gst_number: Optional[str] = Field(None, max_length=60)
    password: str = Field(min_length=6)


class DriverRegister(BaseModel):
    role: Literal["driver"]
    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=10, max_length=15)
    email: EmailStr
    driving_license_number: str = Field(min_length=4, max_length=60)
    vehicle_type: str = Field(min_length=2, max_length=40)
    vehicle_registration_number: str = Field(min_length=4, max_length=30)
    vehicle_capacity_kg: float = Field(gt=0)
    service_area: str = Field(min_length=2, max_length=160)
    password: str = Field(min_length=6)


class CoordinatorRegister(BaseModel):
    role: Literal["coordinator"]
    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=10, max_length=15)
    email: EmailStr
    village: str = Field(min_length=2, max_length=80)
    district: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=6)


RegisterRequest = (
    FarmerRegister | BuyerRegister | DriverRegister | CoordinatorRegister
)


# --------------------------------------------------------------------------- #
# Produce
# --------------------------------------------------------------------------- #


class ProduceCreate(BaseModel):
    crop_name: str = Field(min_length=2, max_length=60)
    quantity_kg: float = Field(gt=0)
    expected_price_per_kg: float = Field(gt=0)
    village: str = Field(min_length=2, max_length=80)
    pickup_location: str = Field(min_length=2, max_length=160)
    available_from: str = Field(min_length=8, max_length=20)
    image_url: Optional[str] = None


class ProduceOut(ORMModel):
    id: int
    farmer_id: int
    crop_name: str
    quantity_kg: float
    remaining_kg: float
    expected_price_per_kg: float
    village: str
    pickup_location: str
    available_from: str
    image_url: Optional[str] = None
    status: str
    verified_weight_kg: Optional[float] = None
    rejection_reason: Optional[str] = None
    created_at: datetime


class VerifyProduceRequest(BaseModel):
    verified_weight_kg: float = Field(gt=0)
    verification_photo_url: Optional[str] = None
    action: Literal["verify", "reject"]
    rejection_reason: Optional[str] = Field(None, max_length=300)


class FarmerRegisterQuick(BaseModel):
    """Coordinator registers a farmer (account created pending activation)."""

    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=10, max_length=15)
    village: str = Field(min_length=2, max_length=80)
    district: str = Field(min_length=2, max_length=80)


# --------------------------------------------------------------------------- #
# Bulk lots / aggregation
# --------------------------------------------------------------------------- #


class LotItemOut(ORMModel):
    id: int
    listing_id: int
    farmer_id: int
    allocated_kg: float
    price_per_kg: float
    farmer_name: Optional[str] = None
    village: Optional[str] = None


class BulkLotOut(ORMModel):
    id: int
    lot_code: str
    crop_name: str
    total_quantity_kg: float
    remaining_kg: float
    farmer_count: int
    pickup_location: str
    available_from: str
    price_per_kg: float
    transport_cost_per_kg: float
    platform_fee_per_kg: float
    buyer_price_per_kg: float
    status: str
    created_at: datetime
    items: list[LotItemOut] = []


class AggregationPreviewItem(BaseModel):
    crop_name: str
    total_verified_kg: float
    village_group: str
    listing_ids: list[int]
    meets_threshold: bool


class AggregationRunOut(BaseModel):
    lots_created: list[BulkLotOut]
    groups_below_threshold: list[AggregationPreviewItem]


class AggregationPreviewOut(BaseModel):
    threshold_kg: float
    groups: list[AggregationPreviewItem]


# --------------------------------------------------------------------------- #
# Orders / payments / deliveries
# --------------------------------------------------------------------------- #


class OrderCreate(BaseModel):
    lot_id: int
    quantity_kg: float = Field(gt=0)


class OrderOut(ORMModel):
    id: int
    order_code: str
    lot_id: int
    quantity_kg: float
    price_per_kg: float
    farmer_price_per_kg: float
    transport_cost_per_kg: float
    platform_fee_per_kg: float
    total_amount: float
    status: str
    created_at: datetime
    lot_crop_name: Optional[str] = None
    lot_pickup_location: Optional[str] = None
    buyer_name: Optional[str] = None
    buyer_business: Optional[str] = None
    delivery_code: Optional[str] = None
    delivery_status: Optional[str] = None


class OrderStatusEventOut(ORMModel):
    id: int
    status: str
    note: Optional[str] = None
    created_at: datetime


class OrderDetailOut(OrderOut):
    status_history: list[OrderStatusEventOut] = []
    items: list[LotItemOut] = []


class PaymentOut(ORMModel):
    id: int
    order_id: int
    amount: float
    farmer_amount: float
    transport_amount: float
    platform_fee_amount: float
    status: str
    transaction_ref: Optional[str] = None
    is_simulated: bool
    created_at: datetime
    order_code: Optional[str] = None
    buyer_name: Optional[str] = None
    crop_name: Optional[str] = None
    quantity_kg: Optional[float] = None


class PaymentAction(BaseModel):
    action: Literal["process", "pay", "fail", "refund"]


class DeliveryOut(ORMModel):
    id: int
    delivery_code: str
    order_id: int
    order_code: Optional[str] = None
    driver_id: Optional[int] = None
    driver_name: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_registration_number: Optional[str] = None
    pickup_location: str
    drop_location: str
    crop_name: str
    load_kg: float
    actual_weight_kg: Optional[float] = None
    distance_km: float
    estimated_earnings: float
    actual_earnings: Optional[float] = None
    required_capacity_kg: float
    status: str
    buyer_name: Optional[str] = None
    created_at: datetime


class DeliveryAccept(BaseModel):
    vehicle_id: int


class PickupConfirm(BaseModel):
    actual_weight_kg: float = Field(gt=0)


class DriverMatchCandidate(BaseModel):
    driver_id: int
    driver_name: str
    vehicle_id: int
    vehicle_type: str
    registration_number: str
    capacity_kg: float
    service_area: str
    distance_score: float
    route_compatibility: float
    match_score: float
    is_available: bool


class DriverMatchOut(BaseModel):
    order_id: int
    candidates: list[DriverMatchCandidate]
    recommended_driver_id: Optional[int] = None
    message: Optional[str] = None


class AssignDriverRequest(BaseModel):
    driver_id: int
    vehicle_id: int


# --------------------------------------------------------------------------- #
# Misc
# --------------------------------------------------------------------------- #


class TrustScoreOut(ORMModel):
    user_id: int
    user_name: Optional[str] = None
    role: Optional[str] = None
    score: float
    completed_transactions: int
    cancelled_transactions: int
    on_time_deliveries: int
    rating_avg: Optional[float] = None
    last_updated_reason: Optional[str] = None


class PricePointOut(ORMModel):
    id: Optional[int] = None
    crop_name: str
    week_start: str
    modal_price_per_kg: float
    is_forecast: bool
    source: str


class PriceSeriesOut(BaseModel):
    crop_name: str
    history: list[PricePointOut]
    forecast: list[PricePointOut]
    current_price: Optional[float] = None
    trend_percent: Optional[float] = None
    trend_direction: Optional[Literal["up", "down", "flat"]] = None
    source_note: str


class CropSummary(BaseModel):
    crop_name: str
    current_price: float
    forecast_price: float
    trend_percent: float
    trend_direction: Literal["up", "down", "flat"]


class SettingsOut(BaseModel):
    aggregation_threshold_kg: float
    platform_fee_per_kg: float
    demo_mode: bool


class SettingsUpdate(BaseModel):
    aggregation_threshold_kg: Optional[float] = Field(None, gt=0)
    platform_fee_per_kg: Optional[float] = Field(None, ge=0)


class UserAdminOut(UserOut):
    village: Optional[str] = None
    district: Optional[str] = None
    business_name: Optional[str] = None
    business_type: Optional[str] = None
    vehicle_summary: Optional[str] = None
    trust_score: Optional[float] = None
    created_at: Optional[datetime] = None


class UserAdminAction(BaseModel):
    action: Literal["verify", "suspend", "activate"]


class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None


class DashboardSummary(BaseModel):
    cards: list[dict]
    extra: dict = {}


class CoordinatorFarmerOut(ORMModel):
    farmer_id: int
    user_id: int
    full_name: str
    phone: str
    village: str
    district: str
    status: str
    listing_count: int = 0


class ReportSeries(BaseModel):
    label: str
    points: list[dict]


TokenResponse.model_rebuild()
