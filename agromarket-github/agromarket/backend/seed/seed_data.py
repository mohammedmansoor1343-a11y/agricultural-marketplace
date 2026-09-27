"""Demo data seeder.

Creates a realistic demonstration dataset:
- Users across all five roles (all demo passwords: Demo@123)
- Verified and pending produce listings for several crops
- Bulk lots with recorded farmer contributions
- Orders, deliveries, payments with transparent breakdowns
- 16 weeks of clearly-labelled sample price history per crop

Run directly:  python -m seed.seed_data
"""
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.security import hash_password  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.models import (  # noqa: E402
    AccountStatus,
    BulkLot,
    BulkLotListing,
    Buyer,
    Coordinator,
    Delivery,
    DeliveryStatus,
    Driver,
    Farmer,
    ListingStatus,
    LotStatus,
    Order,
    OrderStatus,
    OrderStatusEvent,
    Payment,
    PaymentStatus,
    PlatformSetting,
    PriceRecord,
    ProduceListing,
    TrustScore,
    User,
    UserRole,
    Vehicle,
)
from app.services.aggregation import estimate_transport_per_kg  # noqa: E402

random.seed(42)

DEMO_PASSWORD = "Demo@123"


def _mk_user(db, full_name, email, phone, role, status=AccountStatus.verified, **profile):
    user = User(
        full_name=full_name,
        email=email,
        phone=phone,
        hashed_password=hash_password(DEMO_PASSWORD),
        role=role,
        status=status,
        is_active=True,
    )
    db.add(user)
    db.flush()
    if role == UserRole.farmer:
        db.add(Farmer(user_id=user.id, village=profile["village"], district=profile["district"]))
    elif role == UserRole.buyer:
        db.add(Buyer(
            user_id=user.id,
            business_name=profile["business_name"],
            business_type=profile["business_type"],
            business_address=profile["business_address"],
            gst_number=profile.get("gst_number"),
        ))
    elif role == UserRole.driver:
        driver = Driver(
            user_id=user.id,
            license_number=profile["license_number"],
            service_area=profile["service_area"],
            is_available=profile.get("is_available", True),
        )
        db.add(driver)
        db.flush()
        db.add(Vehicle(
            driver_id=driver.id,
            vehicle_type=profile["vehicle_type"],
            registration_number=profile["registration_number"],
            capacity_kg=profile["capacity_kg"],
        ))
    elif role == UserRole.coordinator:
        db.add(Coordinator(user_id=user.id, village=profile["village"], district=profile["district"]))
    db.flush()
    return user


def seed_price_history(db: Session):
    crops = {
        "Tomato": {"base": 26.0, "vol": 0.10, "drift": 0.012},
        "Onion": {"base": 18.0, "vol": 0.07, "drift": -0.006},
        "Potato": {"base": 14.0, "vol": 0.05, "drift": 0.004},
        "Chilli": {"base": 65.0, "vol": 0.09, "drift": 0.015},
    }
    start = datetime(2026, 5, 4)  # a Monday
    for crop, cfg in crops.items():
        price = cfg["base"]
        for w in range(16):
            week = (start + timedelta(days=7 * w)).strftime("%Y-%m-%d")
            price = price * (1 + cfg["drift"]) * (1 + random.uniform(-cfg["vol"], cfg["vol"]) * 0.5)
            db.add(PriceRecord(
                crop_name=crop,
                week_start=week,
                modal_price_per_kg=round(max(price, 2), 2),
                is_forecast=False,
                source="Sample data (demo)",
            ))
    db.flush()


def _add_order_event(db, order, status, note=None):
    db.add(OrderStatusEvent(order_id=order.id, status=status, note=note))


def seed_if_empty() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.scalars(select(User).limit(1)).first() is not None:
            print("Database already seeded — skipping.")
            return

        seed_price_history(db)
        db.add(PlatformSetting(key="aggregation_threshold_kg", value="200", description="Minimum kg per crop/location group to create a bulk lot"))
        db.add(PlatformSetting(key="platform_fee_per_kg", value="2", description="Platform fee charged per kg to buyers"))
        db.flush()

        # ------------------------------------------------------------------ #
        # Admin + coordinators
        # ------------------------------------------------------------------ #
        admin = User(full_name="Platform Admin", email="admin@agromarket.in", phone="9000000001",
                     hashed_password=hash_password(DEMO_PASSWORD), role=UserRole.admin,
                     status=AccountStatus.verified, is_active=True)
        db.add(admin)

        coord_user = _mk_user(db, "Lakshmi Devi", "coordinator@agromarket.in", "9000000002", UserRole.coordinator,
                              village="Kondapur", district="Sangareddy")

        # ------------------------------------------------------------------ #
        # Farmers
        # ------------------------------------------------------------------ #
        farmer_specs = [
            ("Ramesh Yadav", "ramesh@agromarket.in", "9000000010", "Kondapur", "Sangareddy"),
            ("Sita Bai", "sita@agromarket.in", "9000000011", "Kondapur", "Sangareddy"),
            ("Mohan Rao", "mohan@agromarket.in", "9000000012", "Kondapur", "Sangareddy"),
            ("Anitha Kumari", "anitha@agromarket.in", "9000000013", "Moinabad", "Rangareddy"),
            ("Suresh Goud", "suresh@agromarket.in", "9000000014", "Moinabad", "Rangareddy"),
            ("Padma Devi", "padma@agromarket.in", "9000000015", "Moinabad", "Rangareddy"),
            ("Krishna Reddy", "krishna@agromarket.in", "9000000016", "Shankarpally", "Rangareddy"),
            ("Yella Reddy", "yella@agromarket.in", "9000000017", "Shankarpally", "Rangareddy"),
        ]
        farmers = []
        for name, email, phone, village, district in farmer_specs:
            farmers.append(_mk_user(db, name, email, phone, UserRole.farmer, village=village, district=district))
        farmer_profiles = [u.farmer_profile for u in farmers]

        # ------------------------------------------------------------------ #
        # Buyers
        # ------------------------------------------------------------------ #
        buyer_specs = [
            ("Vikram Shah", "Green Basket Supermarkets", "Retailer", "vikram@agromarket.in", "9000000020",
             "12-4-90, Ameerpet, Hyderabad", "36ABCDE1234F1Z5"),
            ("Priya Nair", "Hotel Sunrise Grand", "Hotel", "priya@agromarket.in", "9000000021",
             "5, Banjara Hills Road 12, Hyderabad", "36PQRSX5678L1Z2"),
            ("Arjun Mehta", "Freshway Wholesale Traders", "Wholesaler", "arjun@agromarket.in", "9000000022",
             "Gaddianaram Market, Kukatpally, Hyderabad", None),
        ]
        buyers = []
        for name, biz, btype, email, phone, addr, gst in buyer_specs:
            buyers.append(_mk_user(db, name, email, phone, UserRole.buyer,
                                   business_name=biz, business_type=btype, business_address=addr, gst_number=gst))
        buyer_profiles = [u.buyer_profile for u in buyers]

        # ------------------------------------------------------------------ #
        # Drivers + vehicles
        # ------------------------------------------------------------------ #
        driver_specs = [
            ("Imran Khan", "imran@agromarket.in", "9000000030", "TS0123456789", "Sangareddy, Hyderabad",
             "Mini Truck", "TS09UB1234", 1500, True),
            ("Ravi Teja", "ravi@agromarket.in", "9000000031", "TS0234567890", "Rangareddy, Hyderabad",
             "Bol Pickup", "TS09EF5678", 800, True),
            ("Shankar Naik", "shankar@agromarket.in", "9000000032", "TS0345678901", "Rangareddy, Hyderabad",
             "Tempo", "TS09GH9012", 600, True),
            ("Mallaiah Yadav", "mallaiah@agromarket.in", "9000000033", "TS0456789012", "Sangareddy, Hyderabad",
             "Tractor Trailer", "TS09KL3456", 2500, False),
        ]
        drivers = []
        for name, email, phone, lic, area, vtype, reg, cap, avail in driver_specs:
            drivers.append(_mk_user(db, name, email, phone, UserRole.driver,
                                    license_number=lic, service_area=area, is_available=avail,
                                    vehicle_type=vtype, registration_number=reg, capacity_kg=cap))

        # ------------------------------------------------------------------ #
        # Produce listings (verified pool for aggregation + pending for review)
        # ------------------------------------------------------------------ #
        today = datetime.now(timezone.utc).date()
        avail = (today + timedelta(days=3)).isoformat()

        verified_specs = [
            # (farmer_idx, crop, qty, price, village, pickup)
            (0, "Tomato", 50, 25.0, "Kondapur", "Kondapur Village Center"),
            (1, "Tomato", 40, 26.0, "Kondapur", "Kondapur Village Center"),
            (2, "Tomato", 60, 24.5, "Kondapur", "Kondapur Main Road"),
            (6, "Tomato", 50, 25.5, "Shankarpally", "Kondapur Village Center"),
            (3, "Tomato", 30, 26.5, "Moinabad", "Moinabad Market Yard"),
            (4, "Tomato", 20, 25.5, "Moinabad", "Moinabad Market Yard"),
            (5, "Onion", 90, 17.0, "Moinabad", "Moinabad Market Yard"),
            (3, "Onion", 60, 18.0, "Moinabad", "Moinabad Market Yard"),
            (4, "Onion", 65, 17.5, "Moinabad", "Moinabad Market Yard"),
            (6, "Potato", 120, 14.5, "Shankarpally", "Shankarpally Village Center"),
            (7, "Potato", 85, 15.0, "Shankarpally", "Shankarpally Village Center"),
            (0, "Chilli", 70, 64.0, "Kondapur", "Kondapur Village Center"),
            (1, "Chilli", 30, 63.0, "Kondapur", "Kondapur Village Center"),
            (2, "Chilli", 55, 65.0, "Kondapur", "Kondapur Main Road"),
            (6, "Chilli", 50, 66.0, "Shankarpally", "Kondapur Village Center"),
        ]
        for f_idx, crop, qty, price, village, pickup in verified_specs:
            db.add(ProduceListing(
                farmer_id=farmer_profiles[f_idx].id,
                crop_name=crop,
                quantity_kg=qty,
                remaining_kg=qty,
                expected_price_per_kg=price,
                village=village,
                pickup_location=pickup,
                available_from=avail,
                status=ListingStatus.verified,
                verified_weight_kg=qty,
                verified_at=datetime.now(timezone.utc) - timedelta(days=1),
                verified_by_coordinator_id=coord_user.coordinator_profile.id,
            ))

        pending_specs = [
            (5, "Tomato", 35, 24.0, "Moinabad", "Moinabad Market Yard"),
            (1, "Potato", 60, 13.5, "Kondapur", "Kondapur Village Center"),
            (4, "Chilli", 40, 68.0, "Moinabad", "Moinabad Market Yard"),
        ]
        for f_idx, crop, qty, price, village, pickup in pending_specs:
            db.add(ProduceListing(
                farmer_id=farmer_profiles[f_idx].id,
                crop_name=crop,
                quantity_kg=qty,
                remaining_kg=qty,
                expected_price_per_kg=price,
                village=village,
                pickup_location=pickup,
                available_from=avail,
                status=ListingStatus.pending,
            ))

        db.flush()

        # ------------------------------------------------------------------ #
        # Run aggregation for the demo pool (creates Tomato 200kg lot etc.)
        # ------------------------------------------------------------------ #
        from app.services.aggregation import run_aggregation

        result = run_aggregation(db)
        print(f"Seeded aggregation created {len(result['created'])} bulk lot(s).")

        lots = db.scalars(select(BulkLot)).all()

        # ------------------------------------------------------------------ #
        # Orders: one delivered/completed pair, one in-transit, one awaiting driver
        # ------------------------------------------------------------------ #
        def make_order(lot, buyer_profile, qty, status_path):
            farmer_price = float(lot.price_per_kg)
            transport = float(lot.transport_cost_per_kg)
            fee = float(lot.platform_fee_per_kg)
            buyer_price = farmer_price + transport + fee
            order = Order(
                order_code=f"ORD-DEMO-{buyer_profile.id}{lot.id}{random.randint(10, 99)}",
                buyer_id=buyer_profile.id,
                lot_id=lot.id,
                quantity_kg=qty,
                price_per_kg=round(buyer_price, 2),
                farmer_price_per_kg=farmer_price,
                transport_cost_per_kg=transport,
                platform_fee_per_kg=fee,
                total_amount=round(qty * buyer_price, 2),
                status=OrderStatus.pending,
            )
            db.add(order)
            db.flush()

            lot.remaining_kg = float(lot.remaining_kg) - qty
            distance = 20 + random.randint(0, 45)
            delivery = Delivery(
                delivery_code=f"DLV-DEMO-{order.id:03d}",
                order_id=order.id,
                pickup_location=lot.pickup_location,
                drop_location=buyer_profile.business_address,
                crop_name=lot.crop_name,
                load_kg=qty,
                required_capacity_kg=qty,
                distance_km=distance,
                estimated_earnings=round(200 + 0.9 * qty + 2.5 * distance, 2),
                status=DeliveryStatus.pending,
            )
            db.add(delivery)
            db.flush()

            payment = Payment(
                order_id=order.id,
                amount=order.total_amount,
                farmer_amount=round(qty * farmer_price, 2),
                transport_amount=round(qty * transport, 2),
                platform_fee_amount=round(qty * fee, 2),
                status=PaymentStatus.pending,
                is_simulated=True,
            )
            db.add(payment)
            db.flush()
            _add_order_event(db, order, OrderStatus.pending, "Order placed")
            return order, delivery, payment

        tomato_lot = next((l for l in lots if l.crop_name == "Tomato" and l.status == LotStatus.ready), None)
        potato_lot = next((l for l in lots if l.crop_name == "Potato"), None)
        chilli_lot = next((l for l in lots if l.crop_name == "Chilli"), None)

        # Completed historical order (full chilli lot, paid)
        if chilli_lot:
            o1, d1, p1 = make_order(chilli_lot, buyer_profiles[0], float(chilli_lot.total_quantity_kg), None)
            for status, note in [
                (OrderStatus.confirmed, "Order confirmed"),
                (OrderStatus.driver_assigned, "Driver assigned"),
                (OrderStatus.picked_up, "Pickup confirmed, weight verified"),
                (OrderStatus.in_transit, "In transit to buyer"),
                (OrderStatus.delivered, "Delivered"),
                (OrderStatus.completed, "Order completed"),
            ]:
                o1.status = status
                _add_order_event(db, o1, status, note)
            d1.driver_id = drivers[0].driver_profile.id
            d1.vehicle_id = drivers[0].driver_profile.vehicles[0].id
            d1.status = DeliveryStatus.completed
            d1.actual_weight_kg = o1.quantity_kg
            d1.actual_earnings = d1.estimated_earnings
            d1.completed_at = datetime.now(timezone.utc) - timedelta(days=2)
            drivers[0].driver_profile.is_available = True
            p1.status = PaymentStatus.paid
            p1.transaction_ref = "TXN-DEMO0001"
            chilli_lot.status = LotStatus.completed

            db.add(TrustScore(
                user_id=drivers[0].id,
                score=88.0, completed_transactions=1, on_time_deliveries=1,
                rating_avg=4.6, last_updated_reason="demo seed",
            ))

        # In-transit order
        if potato_lot:
            o2, d2, p2 = make_order(potato_lot, buyer_profiles[1], 150, None)
            for status, note in [
                (OrderStatus.confirmed, "Order confirmed"),
                (OrderStatus.driver_assigned, "Driver assigned"),
                (OrderStatus.picked_up, "Pickup confirmed, 150 kg verified"),
                (OrderStatus.in_transit, "In transit to buyer"),
            ]:
                o2.status = status
                _add_order_event(db, o2, status, note)
            d2.driver_id = drivers[1].driver_profile.id
            d2.vehicle_id = drivers[1].driver_profile.vehicles[0].id
            d2.status = DeliveryStatus.in_transit
            d2.actual_weight_kg = 150
            p2.status = PaymentStatus.processing
            p2.transaction_ref = "TXN-DEMO0002"
            potato_lot.status = LotStatus.in_transit

        # Fresh order awaiting driver match
        if tomato_lot:
            o3, d3, p3 = make_order(tomato_lot, buyer_profiles[2], 60, None)
            o3.status = OrderStatus.confirmed
            _add_order_event(db, o3, OrderStatus.confirmed, "Order confirmed; finding a driver")
            p3.status = PaymentStatus.pending
            tomato_lot.status = LotStatus.ordered

        db.commit()
        from app.services.trust import recompute_all

        recompute_all(db)
        print("Demo data seeded successfully.")
        print(f"Demo login password for every seeded account: {DEMO_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_if_empty()
