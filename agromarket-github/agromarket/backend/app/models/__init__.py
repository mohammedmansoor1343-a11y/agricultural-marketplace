from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class TimestampMixin:
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


# --------------------------------------------------------------------------- #
# Users and role profiles
# --------------------------------------------------------------------------- #


class UserRole:
    """Plain string enum usable both in Python and in DB check constraints."""

    farmer = "farmer"
    buyer = "buyer"
    driver = "driver"
    coordinator = "coordinator"
    admin = "admin"

    ALL = (farmer, buyer, driver, coordinator, admin)


class AccountStatus:
    pending = "pending"
    verified = "verified"
    suspended = "suspended"

    ALL = (pending, verified, suspended)


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(f"role IN {UserRole.ALL}", name="ck_users_role"),
        CheckConstraint(f"status IN {AccountStatus.ALL}", name="ck_users_status"),
        UniqueConstraint("phone", name="uq_users_phone"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(160), unique=True, index=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=AccountStatus.pending)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    farmer_profile = relationship("Farmer", back_populates="user", uselist=False, cascade="all, delete-orphan")
    buyer_profile = relationship("Buyer", back_populates="user", uselist=False, cascade="all, delete-orphan")
    driver_profile = relationship("Driver", back_populates="user", uselist=False, cascade="all, delete-orphan")
    coordinator_profile = relationship(
        "Coordinator", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    trust_scores = relationship("TrustScore", back_populates="user", cascade="all, delete-orphan")


class Farmer(TimestampMixin, Base):
    __tablename__ = "farmers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    village: Mapped[str] = mapped_column(String(80), nullable=False)
    district: Mapped[str] = mapped_column(String(80), nullable=False)

    user = relationship("User", back_populates="farmer_profile")
    listings = relationship("ProduceListing", back_populates="farmer")
    lot_items = relationship("BulkLotListing", back_populates="farmer")


class Buyer(TimestampMixin, Base):
    __tablename__ = "buyers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    business_name: Mapped[str] = mapped_column(String(160), nullable=False)
    business_type: Mapped[str] = mapped_column(String(60), nullable=False)
    business_address: Mapped[str] = mapped_column(Text, nullable=False)
    gst_number: Mapped[str | None] = mapped_column(String(60))

    user = relationship("User", back_populates="buyer_profile")
    orders = relationship("Order", back_populates="buyer")


class Driver(TimestampMixin, Base):
    __tablename__ = "drivers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    license_number: Mapped[str] = mapped_column(String(60), nullable=False)
    service_area: Mapped[str] = mapped_column(String(160), nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    user = relationship("User", back_populates="driver_profile")
    vehicles = relationship("Vehicle", back_populates="driver", cascade="all, delete-orphan")
    deliveries = relationship("Delivery", back_populates="driver")


class Vehicle(TimestampMixin, Base):
    __tablename__ = "vehicles"
    __table_args__ = (
        UniqueConstraint("registration_number", name="uq_vehicles_registration"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    driver_id: Mapped[int] = mapped_column(ForeignKey("drivers.id", ondelete="CASCADE"))
    vehicle_type: Mapped[str] = mapped_column(String(40), nullable=False)
    registration_number: Mapped[str] = mapped_column(String(30), nullable=False)
    capacity_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    driver = relationship("Driver", back_populates="vehicles")


class Coordinator(TimestampMixin, Base):
    __tablename__ = "coordinators"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    village: Mapped[str] = mapped_column(String(80), nullable=False)
    district: Mapped[str] = mapped_column(String(80), nullable=False)

    user = relationship("User", back_populates="coordinator_profile")
    verifications = relationship("ProduceListing", back_populates="verifier")


# --------------------------------------------------------------------------- #
# Produce, aggregation, orders
# --------------------------------------------------------------------------- #


class ListingStatus:
    pending = "pending"
    verified = "verified"
    rejected = "rejected"
    aggregated = "aggregated"   # fully allocated into a bulk lot
    partial = "partial"         # some quantity allocated

    ALL = (pending, verified, rejected, aggregated, partial)


class ProduceListing(TimestampMixin, Base):
    __tablename__ = "produce_listings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    farmer_id: Mapped[int] = mapped_column(ForeignKey("farmers.id", ondelete="CASCADE"))
    crop_name: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    quantity_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    remaining_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    expected_price_per_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    village: Mapped[str] = mapped_column(String(80), nullable=False)
    pickup_location: Mapped[str] = mapped_column(String(160), nullable=False)
    available_from: Mapped[str] = mapped_column(String(20), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=ListingStatus.pending, index=True)
    verified_weight_kg: Mapped[float | None] = mapped_column(Numeric(10, 2))
    verification_photo_url: Mapped[str | None] = mapped_column(String(300))
    rejection_reason: Mapped[str | None] = mapped_column(String(300))
    verified_by_coordinator_id: Mapped[int | None] = mapped_column(ForeignKey("coordinators.id", ondelete="SET NULL"))
    verified_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))

    farmer = relationship("Farmer", back_populates="listings")
    verifier = relationship("Coordinator", back_populates="verifications")
    lot_items = relationship("BulkLotListing", back_populates="listing", cascade="all, delete-orphan")


class LotStatus:
    collecting = "collecting"
    ready = "ready"
    ordered = "ordered"
    pickup_assigned = "assigned"
    in_transit = "in_transit"
    delivered = "delivered"
    completed = "completed"
    cancelled = "cancelled"

    ALL = (collecting, ready, ordered, pickup_assigned, in_transit, delivered, completed, cancelled)


class BulkLot(TimestampMixin, Base):
    __tablename__ = "bulk_lots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lot_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    crop_name: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    total_quantity_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    remaining_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    farmer_count: Mapped[int] = mapped_column(Integer, nullable=False)
    pickup_location: Mapped[str] = mapped_column(String(160), nullable=False)
    available_from: Mapped[str] = mapped_column(String(20), nullable=False)
    price_per_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    transport_cost_per_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    platform_fee_per_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default=LotStatus.collecting, index=True)

    lot_items = relationship("BulkLotListing", back_populates="lot", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="lot", cascade="all, delete-orphan")


class BulkLotListing(TimestampMixin, Base):
    """Join table preserving the farmer contribution trail for each bulk lot."""

    __tablename__ = "bulk_lot_listings"
    __table_args__ = (
        UniqueConstraint("listing_id", "lot_id", name="uq_lot_listing_pair"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lot_id: Mapped[int] = mapped_column(ForeignKey("bulk_lots.id", ondelete="CASCADE"))
    listing_id: Mapped[int] = mapped_column(ForeignKey("produce_listings.id", ondelete="CASCADE"))
    farmer_id: Mapped[int] = mapped_column(ForeignKey("farmers.id", ondelete="CASCADE"))
    allocated_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    price_per_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    lot = relationship("BulkLot", back_populates="lot_items")
    listing = relationship("ProduceListing", back_populates="lot_items")
    farmer = relationship("Farmer", back_populates="lot_items")


class OrderStatus:
    pending = "pending"
    confirmed = "confirmed"
    driver_assigned = "driver_assigned"
    pickup_scheduled = "pickup_scheduled"
    picked_up = "picked_up"
    in_transit = "in_transit"
    delivered = "delivered"
    completed = "completed"
    cancelled = "cancelled"

    ALL = (pending, confirmed, driver_assigned, pickup_scheduled, picked_up, in_transit, delivered, completed, cancelled)


class Order(TimestampMixin, Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    buyer_id: Mapped[int] = mapped_column(ForeignKey("buyers.id", ondelete="CASCADE"))
    lot_id: Mapped[int] = mapped_column(ForeignKey("bulk_lots.id", ondelete="CASCADE"))
    quantity_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    price_per_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    farmer_price_per_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    transport_cost_per_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    platform_fee_per_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default=OrderStatus.pending, index=True)

    buyer = relationship("Buyer", back_populates="orders")
    lot = relationship("BulkLot", back_populates="orders")
    delivery = relationship("Delivery", back_populates="order", uselist=False, cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="order", uselist=False, cascade="all, delete-orphan")
    status_history = relationship("OrderStatusEvent", back_populates="order", cascade="all, delete-orphan")


class OrderStatusEvent(TimestampMixin, Base):
    __tablename__ = "order_status_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    note: Mapped[str | None] = mapped_column(String(300))

    order = relationship("Order", back_populates="status_history")


# --------------------------------------------------------------------------- #
# Deliveries and payments
# --------------------------------------------------------------------------- #


class DeliveryStatus:
    pending = "pending"          # awaiting driver match
    accepted = "accepted"
    at_pickup = "at_pickup"
    pickup_confirmed = "pickup_confirmed"
    in_transit = "in_transit"
    delivered = "delivered"
    completed = "completed"
    cancelled = "cancelled"

    ALL = (pending, accepted, at_pickup, pickup_confirmed, in_transit, delivered, completed, cancelled)


class Delivery(TimestampMixin, Base):
    __tablename__ = "deliveries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    delivery_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), unique=True)
    driver_id: Mapped[int | None] = mapped_column(ForeignKey("drivers.id", ondelete="SET NULL"))
    vehicle_id: Mapped[int | None] = mapped_column(ForeignKey("vehicles.id", ondelete="SET NULL"))
    pickup_location: Mapped[str] = mapped_column(String(160), nullable=False)
    drop_location: Mapped[str] = mapped_column(String(160), nullable=False)
    crop_name: Mapped[str] = mapped_column(String(60), nullable=False)
    load_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    actual_weight_kg: Mapped[float | None] = mapped_column(Numeric(10, 2))
    distance_km: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    estimated_earnings: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    actual_earnings: Mapped[float | None] = mapped_column(Numeric(10, 2))
    required_capacity_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default=DeliveryStatus.pending, index=True)
    assigned_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))

    order = relationship("Order", back_populates="delivery")
    driver = relationship("Driver", back_populates="deliveries")
    vehicle = relationship("Vehicle")


# --------------------------------------------------------------------------- #
# Payments, trust, prices, ratings, settings
# --------------------------------------------------------------------------- #


class PaymentStatus:
    pending = "pending"
    processing = "processing"
    paid = "paid"
    failed = "failed"
    refunded = "refunded"

    ALL = (pending, processing, paid, failed, refunded)


class Payment(TimestampMixin, Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), unique=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    farmer_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    transport_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    platform_fee_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=PaymentStatus.pending, index=True)
    transaction_ref: Mapped[str | None] = mapped_column(String(60), unique=True)
    is_simulated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    order = relationship("Order", back_populates="payment")


class TrustScore(TimestampMixin, Base):
    __tablename__ = "trust_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=70)
    completed_transactions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cancelled_transactions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    on_time_deliveries: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rating_avg: Mapped[float | None] = mapped_column(Numeric(3, 2))
    last_updated_reason: Mapped[str | None] = mapped_column(String(200))

    user = relationship("User", back_populates="trust_scores")


class PriceRecord(TimestampMixin, Base):
    """Historical (and forecast) crop prices. Source must always be disclosed."""

    __tablename__ = "price_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    crop_name: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    week_start: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    modal_price_per_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    is_forecast: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    source: Mapped[str] = mapped_column(String(120), nullable=False, default="Sample data (demo)")

    __table_args__ = (
        UniqueConstraint("crop_name", "week_start", "is_forecast", name="uq_price_crop_week_kind"),
    )


class Rating(TimestampMixin, Base):
    __tablename__ = "ratings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    rater_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    ratee_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    stars: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(String(300))


class PlatformSetting(TimestampMixin, Base):
    """Single-row-per-key store for admin-configurable platform parameters."""

    __tablename__ = "platform_settings"

    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    value: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(String(200), nullable=False, default="")
