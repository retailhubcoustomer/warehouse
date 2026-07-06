"""ShipLink backend end-to-end pytest suite.

Covers:
- Health endpoints
- Auth (super admin login, customer registration, RBAC, brute-force lockout)
- Admin routes (stats, cities/warehouses list+create, live-map, assign-manager)
- Marketplace routes (browse, place order, coupon, my orders)
- Warehouse Manager routes (RBAC scoping)
- Shop Owner routes (products CRUD, accept order)
- Payments (mocked Razorpay)
- Sync endpoints (shop-app integration mock)
- Full order lifecycle (customer -> shop -> collection -> warehouse -> delivery)
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fall back to reading frontend .env if env var not exported to pytest process
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL"):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass
assert BASE_URL, "REACT_APP_BACKEND_URL not configured"

ADMIN = ("admin@shiplink.com", "Admin@123")
WH1 = ("wh1@shiplink.com", "Warehouse@123")
SHOP_OWNER = ("shop.owner@shiplink.com", "Shop@123")
DELIVERY = ("delivery.kolkata.1@shiplink.com", "Partner@123")
COLLECTION = ("collection.kolkata.1@shiplink.com", "Partner@123")


# ---------------- helpers ----------------
def new_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def login(session, email, password):
    r = session.post(f"{BASE_URL}/api/auth/login",
                     json={"email": email, "password": password}, timeout=15)
    return r


# ---------------- shared state across tests ----------------
STATE = {}


# ================== 1. Health ==================
class TestHealth:
    def test_root(self):
        r = requests.get(f"{BASE_URL}/api/", timeout=10)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_health(self):
        r = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ================== 2. Super Admin ==================
class TestSuperAdmin:
    def test_admin_login(self):
        s = new_session()
        r = login(s, *ADMIN)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["role"] == "super_admin"
        # cookies should be set
        assert "access_token" in s.cookies.get_dict() or "access_token" in [c.name for c in s.cookies]
        # /me should return the same user
        me = s.get(f"{BASE_URL}/api/auth/me", timeout=10)
        assert me.status_code == 200
        assert me.json()["role"] == "super_admin"
        STATE["admin_session"] = s

    def test_admin_stats(self):
        s = STATE["admin_session"]
        r = s.get(f"{BASE_URL}/api/admin/stats", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["cities"] >= 4
        assert d["warehouses"] >= 6

    def test_admin_cities_seeded(self):
        s = STATE["admin_session"]
        r = s.get(f"{BASE_URL}/api/admin/cities", timeout=10)
        assert r.status_code == 200
        cities = r.json()
        names = {c["name"] for c in cities}
        for expected in ("Kolkata", "Siliguri", "Durgapur", "Malda"):
            assert expected in names, f"Missing city: {expected}"
        STATE["cities"] = cities
        STATE["kolkata"] = next(c for c in cities if c["name"] == "Kolkata")

    def test_admin_warehouses_seeded(self):
        s = STATE["admin_session"]
        r = s.get(f"{BASE_URL}/api/admin/warehouses", timeout=10)
        assert r.status_code == 200
        whs = r.json()
        assert len(whs) >= 6, f"Expected >=6 warehouses, got {len(whs)}"
        STATE["warehouses"] = whs

    def test_admin_shops_orders(self):
        s = STATE["admin_session"]
        rs = s.get(f"{BASE_URL}/api/admin/shops", timeout=10)
        assert rs.status_code == 200
        assert isinstance(rs.json(), list)
        ro = s.get(f"{BASE_URL}/api/admin/orders", timeout=10)
        assert ro.status_code == 200
        assert isinstance(ro.json(), list)

    def test_admin_create_city_and_warehouse(self):
        s = STATE["admin_session"]
        payload = {"name": f"TEST_City_{uuid.uuid4().hex[:6]}", "state": "West Bengal",
                   "lat": 22.9, "lng": 88.5}
        rc = s.post(f"{BASE_URL}/api/admin/cities", json=payload, timeout=10)
        assert rc.status_code == 200, rc.text
        city = rc.json()
        assert city["name"] == payload["name"]
        assert "city_id" in city
        STATE["test_city_id"] = city["city_id"]

        wpayload = {"name": "TEST_Warehouse_A", "code": f"TWH-{uuid.uuid4().hex[:4]}",
                    "city_id": city["city_id"], "address": "Test Address",
                    "lat": 22.9, "lng": 88.5, "capacity": 1000,
                    "service_radius_km": 40.0}
        rw = s.post(f"{BASE_URL}/api/admin/warehouses", json=wpayload, timeout=10)
        assert rw.status_code == 200, rw.text
        wh = rw.json()
        assert wh["name"] == "TEST_Warehouse_A"
        assert "warehouse_id" in wh
        STATE["test_warehouse_id"] = wh["warehouse_id"]

    def test_admin_assign_manager(self):
        s = STATE["admin_session"]
        # find a warehouse_manager user (wh1)
        r = s.get(f"{BASE_URL}/api/admin/users", params={"role": "warehouse_manager"}, timeout=10)
        assert r.status_code == 200
        managers = r.json()
        assert len(managers) > 0
        user_id = managers[0]["user_id"]
        # assign to the new test warehouse
        wid = STATE["test_warehouse_id"]
        r2 = s.post(f"{BASE_URL}/api/admin/warehouses/{wid}/assign-manager",
                    json={"user_id": user_id}, timeout=10)
        assert r2.status_code == 200, r2.text
        assert r2.json().get("ok") is True

    def test_admin_live_map(self):
        s = STATE["admin_session"]
        r = s.get(f"{BASE_URL}/api/admin/live-map", timeout=10)
        assert r.status_code == 200
        d = r.json()
        for k in ("warehouses", "shops", "partners", "orders"):
            assert k in d, f"Missing {k}"
            assert isinstance(d[k], list)


# ================== 3. Customer ==================
class TestCustomer:
    def test_customer_register(self):
        s = new_session()
        email = f"TEST_customer_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "email": email, "password": "Cust@1234",
            "name": "TEST Customer", "role": "customer",
            "phone": "9800000000",
        }
        r = s.post(f"{BASE_URL}/api/auth/register", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        u = r.json()["user"]
        assert u["email"] == email.lower()
        assert u["role"] == "customer"
        # /me
        me = s.get(f"{BASE_URL}/api/auth/me", timeout=10)
        assert me.status_code == 200
        assert me.json()["email"] == email.lower()
        STATE["customer_session"] = s
        STATE["customer_email"] = email

    def test_marketplace_cities_and_shops(self):
        s = STATE["customer_session"]
        rc = s.get(f"{BASE_URL}/api/marketplace/cities", timeout=10)
        assert rc.status_code == 200
        cities = rc.json()
        assert len(cities) >= 4
        kolkata = next(c for c in cities if c["name"] == "Kolkata")
        STATE["kolkata_id"] = kolkata["city_id"]

        rs = s.get(f"{BASE_URL}/api/marketplace/shops",
                   params={"city_id": kolkata["city_id"]}, timeout=10)
        assert rs.status_code == 200
        shops = rs.json()
        assert len(shops) > 0
        # Use the shop owned by seeded shop.owner if possible so we can test accept flow
        STATE["kolkata_shops"] = shops

    def test_marketplace_shop_detail(self):
        s = STATE["customer_session"]
        shop = STATE["kolkata_shops"][0]
        r = s.get(f"{BASE_URL}/api/marketplace/shops/{shop['shop_id']}", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert "shop" in d and "products" in d
        assert d["shop"]["shop_id"] == shop["shop_id"]
        assert len(d["products"]) > 0
        STATE["shop_with_products"] = d

    def test_place_order_and_routing(self):
        """Place an order — verify nearest warehouse routing + total math."""
        s = STATE["customer_session"]
        # Log in as shop owner temporarily to get their shop id, so lifecycle can be tested
        so_session = new_session()
        assert login(so_session, *SHOP_OWNER).status_code == 200
        so_shop = so_session.get(f"{BASE_URL}/api/shop/me", timeout=10).json()
        STATE["shop_owner_shop_id"] = so_shop["shop_id"]
        STATE["shop_owner_session"] = so_session

        # fetch that shop's products (as a customer)
        sd = s.get(f"{BASE_URL}/api/marketplace/shops/{so_shop['shop_id']}", timeout=10).json()
        products = sd["products"]
        assert len(products) >= 2

        # Cart of ~subtotal >=200 for coupon test later — but this order will NOT use coupon
        items = [
            {"product_id": products[0]["product_id"], "name": products[0]["name"],
             "price": products[0]["price"], "qty": 1,
             "image_url": products[0].get("image_url")},
            {"product_id": products[1]["product_id"], "name": products[1]["name"],
             "price": products[1]["price"], "qty": 1,
             "image_url": products[1].get("image_url")},
        ]
        subtotal_expected = items[0]["price"] * 1 + items[1]["price"] * 1

        payload = {
            "shop_id": so_shop["shop_id"],
            "items": items,
            "delivery_address": "Salt Lake Sector V, Kolkata",
            "delivery_lat": 22.5726,
            "delivery_lng": 88.3639,
            "payment_method": "cod",
        }
        r = s.post(f"{BASE_URL}/api/marketplace/orders", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        o = r.json()
        assert "order_id" in o
        assert "warehouse_id" in o and o["warehouse_id"]
        assert "warehouse_name" in o and o["warehouse_name"]
        assert o["subtotal"] == subtotal_expected
        assert o["delivery_fee"] == 30
        assert o["discount"] == 0
        assert round(o["total"], 2) == round(subtotal_expected + 30, 2)
        assert o["status"] == "placed"
        STATE["order_id"] = o["order_id"]
        STATE["order_shop_id"] = o["shop_id"]

    def test_coupon_welcome10(self):
        """Apply WELCOME10 on a new order with subtotal >= 200 — expect 10% capped at 100."""
        s = STATE["customer_session"]
        so_shop_id = STATE["shop_owner_shop_id"]
        sd = s.get(f"{BASE_URL}/api/marketplace/shops/{so_shop_id}", timeout=10).json()
        products = sd["products"]
        # pick a product priced >= 200 (or increase qty)
        prod = products[0]
        qty = max(1, int((250 // prod["price"]) + 1))  # ensure subtotal >= 200
        subtotal = prod["price"] * qty
        items = [{"product_id": prod["product_id"], "name": prod["name"],
                  "price": prod["price"], "qty": qty,
                  "image_url": prod.get("image_url")}]
        payload = {
            "shop_id": so_shop_id, "items": items,
            "delivery_address": "Test Addr",
            "delivery_lat": 22.5726, "delivery_lng": 88.3639,
            "payment_method": "cod", "coupon_code": "WELCOME10",
        }
        r = s.post(f"{BASE_URL}/api/marketplace/orders", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        o = r.json()
        expected_discount = min(subtotal * 0.10, 100)
        assert abs(o["discount"] - expected_discount) < 0.01, \
            f"Discount {o['discount']} != expected {expected_discount}"
        expected_total = round(subtotal - expected_discount + 30, 2)
        assert abs(o["total"] - expected_total) < 0.01
        STATE["coupon_order_id"] = o["order_id"]

    def test_my_orders_scoped(self):
        s = STATE["customer_session"]
        r = s.get(f"{BASE_URL}/api/marketplace/orders", timeout=10)
        assert r.status_code == 200
        orders = r.json()
        assert len(orders) >= 2
        # customer sees only their own
        me = s.get(f"{BASE_URL}/api/auth/me", timeout=10).json()
        for o in orders:
            assert o["customer_id"] == me["user_id"]

    def test_my_order_detail(self):
        s = STATE["customer_session"]
        oid = STATE["order_id"]
        r = s.get(f"{BASE_URL}/api/marketplace/orders/{oid}", timeout=10)
        assert r.status_code == 200
        o = r.json()
        assert o["order_id"] == oid
        assert isinstance(o.get("timeline"), list)
        assert len(o["timeline"]) >= 1


# ================== 4. Warehouse Manager ==================
class TestWarehouseManager:
    def test_wh_login_and_me(self):
        s = new_session()
        r = login(s, *WH1)
        assert r.status_code == 200, r.text
        assert r.json()["user"]["role"] == "warehouse_manager"
        me = s.get(f"{BASE_URL}/api/auth/me", timeout=10).json()
        assert me["role"] == "warehouse_manager"
        STATE["wh_session_wh1"] = s
        # /warehouse/me
        w = s.get(f"{BASE_URL}/api/warehouse/me", timeout=10)
        assert w.status_code == 200
        assert w.json().get("warehouse_id") == me["warehouse_id"]
        STATE["wh1_warehouse_id"] = me["warehouse_id"]
        STATE["wh1_city_id"] = me.get("city_id")

    def test_wh_dashboard(self):
        s = STATE["wh_session_wh1"]
        r = s.get(f"{BASE_URL}/api/warehouse/dashboard", timeout=10)
        assert r.status_code == 200
        d = r.json()
        for key in ("placed", "accepted", "packed", "out_for_delivery", "delivered"):
            assert key in d

    def test_wh_orders_scoped(self):
        s = STATE["wh_session_wh1"]
        r = s.get(f"{BASE_URL}/api/warehouse/orders", timeout=10)
        assert r.status_code == 200
        wid = STATE["wh1_warehouse_id"]
        for o in r.json():
            assert o["warehouse_id"] == wid, "RBAC leak: wh1 seeing other warehouse orders"

    def test_wh_rbac_403_on_admin(self):
        s = STATE["wh_session_wh1"]
        r1 = s.get(f"{BASE_URL}/api/admin/stats", timeout=10)
        assert r1.status_code == 403, f"Expected 403, got {r1.status_code}"
        r2 = s.get(f"{BASE_URL}/api/admin/cities", timeout=10)
        assert r2.status_code == 403


# ================== 5. Shop Owner ==================
class TestShopOwner:
    def test_shop_me_and_dashboard(self):
        s = STATE["shop_owner_session"]
        r1 = s.get(f"{BASE_URL}/api/shop/me", timeout=10)
        assert r1.status_code == 200
        r2 = s.get(f"{BASE_URL}/api/shop/dashboard", timeout=10)
        assert r2.status_code == 200
        d = r2.json()
        assert "products" in d and "orders_today" in d

    def test_shop_products_crud(self):
        s = STATE["shop_owner_session"]
        # list
        r = s.get(f"{BASE_URL}/api/shop/products", timeout=10)
        assert r.status_code == 200
        # create
        payload = {"name": f"TEST_Product_{uuid.uuid4().hex[:6]}",
                   "description": "Test", "price": 99.0, "stock": 50,
                   "category": "grocery"}
        rc = s.post(f"{BASE_URL}/api/shop/products", json=payload, timeout=10)
        assert rc.status_code == 200, rc.text
        p = rc.json()
        assert p["name"] == payload["name"]
        assert "product_id" in p
        pid = p["product_id"]
        # patch stock
        ru = s.patch(f"{BASE_URL}/api/shop/products/{pid}",
                     json={"stock": 25}, timeout=10)
        assert ru.status_code == 200
        # verify
        listing = s.get(f"{BASE_URL}/api/shop/products", timeout=10).json()
        found = next((x for x in listing if x["product_id"] == pid), None)
        assert found is not None
        assert found["stock"] == 25
        # delete (soft)
        rd = s.delete(f"{BASE_URL}/api/shop/products/{pid}", timeout=10)
        assert rd.status_code == 200

    def test_shop_orders_scoped_and_accept(self):
        s = STATE["shop_owner_session"]
        r = s.get(f"{BASE_URL}/api/shop/orders", timeout=10)
        assert r.status_code == 200
        orders = r.json()
        sid = STATE["shop_owner_shop_id"]
        for o in orders:
            assert o["shop_id"] == sid
        # accept the test order placed earlier
        oid = STATE["order_id"]
        ra = s.post(f"{BASE_URL}/api/shop/orders/{oid}/accept", timeout=10)
        assert ra.status_code == 200


# ================== 6. Assign warehouse manager to test order ==================
class TestOrderRoutingContext:
    """Ensure the wh session we test with actually owns the test order (routing may
    land on any Kolkata warehouse). Find the correct wh manager for the order's
    warehouse and stash session for downstream tests."""
    def test_find_correct_wh_session(self):
        admin_s = STATE["admin_session"]
        oid = STATE["order_id"]
        # fetch order via admin
        r = admin_s.get(f"{BASE_URL}/api/admin/orders", timeout=10)
        assert r.status_code == 200
        order = next((o for o in r.json() if o["order_id"] == oid), None)
        assert order is not None
        target_wid = order["warehouse_id"]
        STATE["order_warehouse_id"] = target_wid
        # find the manager for this warehouse
        wh_list = admin_s.get(f"{BASE_URL}/api/admin/warehouses", timeout=10).json()
        target_wh = next(w for w in wh_list if w["warehouse_id"] == target_wid)
        manager_id = target_wh.get("manager_id")
        assert manager_id, f"No manager assigned to warehouse {target_wid}"
        # find email
        users = admin_s.get(f"{BASE_URL}/api/admin/users",
                            params={"role": "warehouse_manager"}, timeout=10).json()
        manager = next(u for u in users if u["user_id"] == manager_id)
        # wh1..wh6 all have password Warehouse@123
        wh_s = new_session()
        r = login(wh_s, manager["email"], "Warehouse@123")
        assert r.status_code == 200, r.text
        STATE["order_wh_session"] = wh_s


# ================== 7. Full lifecycle ==================
class TestFullLifecycle:
    def test_wh_assign_collection(self):
        admin_s = STATE["admin_session"]
        wh_s = STATE["order_wh_session"]
        oid = STATE["order_id"]
        # get order's city
        wh_me = wh_s.get(f"{BASE_URL}/api/auth/me", timeout=10).json()
        city_id = wh_me["city_id"]
        # find a collection partner in this city
        cps = admin_s.get(f"{BASE_URL}/api/admin/users",
                          params={"role": "collection_partner"}, timeout=10).json()
        cp = next((u for u in cps if u.get("city_id") == city_id), cps[0])
        STATE["collection_partner_email"] = cp["email"]
        STATE["collection_partner_id"] = cp["user_id"]
        r = wh_s.post(f"{BASE_URL}/api/warehouse/orders/{oid}/assign-collection",
                      json={"partner_id": cp["user_id"]}, timeout=10)
        assert r.status_code == 200, r.text

    def test_collection_pickup_and_drop(self):
        # login as the assigned collection partner
        cs = new_session()
        r = login(cs, STATE["collection_partner_email"], "Partner@123")
        assert r.status_code == 200, r.text
        # GET tasks
        rt = cs.get(f"{BASE_URL}/api/collection/tasks", timeout=10)
        assert rt.status_code == 200
        tasks = rt.json()
        oid = STATE["order_id"]
        assert any(t["order_id"] == oid for t in tasks), "Collection task not visible"
        # pickup
        rp = cs.post(f"{BASE_URL}/api/collection/tasks/{oid}/pickup", timeout=10)
        assert rp.status_code == 200, rp.text
        # drop
        rd = cs.post(f"{BASE_URL}/api/collection/tasks/{oid}/drop", timeout=10)
        assert rd.status_code == 200, rd.text

    def test_wh_pack(self):
        wh_s = STATE["order_wh_session"]
        oid = STATE["order_id"]
        r = wh_s.post(f"{BASE_URL}/api/warehouse/orders/{oid}/pack", timeout=10)
        assert r.status_code == 200, r.text
        # verify status via admin
        admin_s = STATE["admin_session"]
        orders = admin_s.get(f"{BASE_URL}/api/admin/orders", timeout=10).json()
        order = next(o for o in orders if o["order_id"] == oid)
        assert order["status"] == "packed", f"Expected packed, got {order['status']}"

    def test_wh_assign_delivery(self):
        admin_s = STATE["admin_session"]
        wh_s = STATE["order_wh_session"]
        oid = STATE["order_id"]
        wh_me = wh_s.get(f"{BASE_URL}/api/auth/me", timeout=10).json()
        city_id = wh_me["city_id"]
        dps = admin_s.get(f"{BASE_URL}/api/admin/users",
                          params={"role": "delivery_partner"}, timeout=10).json()
        dp = next((u for u in dps if u.get("city_id") == city_id), dps[0])
        STATE["delivery_partner_email"] = dp["email"]
        r = wh_s.post(f"{BASE_URL}/api/warehouse/orders/{oid}/assign-delivery",
                      json={"partner_id": dp["user_id"]}, timeout=10)
        assert r.status_code == 200, r.text

    def test_delivery_partner_flow(self):
        ds = new_session()
        r = login(ds, STATE["delivery_partner_email"], "Partner@123")
        assert r.status_code == 200
        # GET stats
        rs = ds.get(f"{BASE_URL}/api/delivery/stats", timeout=10)
        assert rs.status_code == 200
        # GET orders — should include our order
        ro = ds.get(f"{BASE_URL}/api/delivery/orders", timeout=10)
        assert ro.status_code == 200
        oid = STATE["order_id"]
        found = [o for o in ro.json() if o["order_id"] == oid]
        assert found, "Delivery partner does not see assigned order"
        # complete delivery
        rd = ds.post(f"{BASE_URL}/api/delivery/orders/{oid}/status",
                     json={"status": "delivered"}, timeout=10)
        assert rd.status_code == 200, rd.text
        # verify final
        admin_s = STATE["admin_session"]
        order = next(o for o in admin_s.get(f"{BASE_URL}/api/admin/orders", timeout=10).json()
                     if o["order_id"] == oid)
        assert order["status"] == "delivered"
        # timeline should have all key statuses
        timeline_statuses = [e["status"] for e in order["timeline"]]
        for s in ("placed", "accepted", "collected", "at_warehouse",
                  "packed", "out_for_delivery", "delivered"):
            assert s in timeline_statuses, f"Timeline missing '{s}': {timeline_statuses}"


# ================== 8. Payments ==================
class TestPayments:
    def test_create_and_verify(self):
        # place a fresh order for payment test
        s = STATE["customer_session"]
        so_shop_id = STATE["shop_owner_shop_id"]
        sd = s.get(f"{BASE_URL}/api/marketplace/shops/{so_shop_id}", timeout=10).json()
        prod = sd["products"][0]
        items = [{"product_id": prod["product_id"], "name": prod["name"],
                  "price": prod["price"], "qty": 1,
                  "image_url": prod.get("image_url")}]
        payload = {"shop_id": so_shop_id, "items": items,
                   "delivery_address": "Pay Addr",
                   "delivery_lat": 22.5726, "delivery_lng": 88.3639,
                   "payment_method": "razorpay"}
        r = s.post(f"{BASE_URL}/api/marketplace/orders", json=payload, timeout=15)
        assert r.status_code == 200
        oid = r.json()["order_id"]
        # create
        rc = s.post(f"{BASE_URL}/api/payments/create-order",
                    json={"order_id": oid}, timeout=10)
        assert rc.status_code == 200, rc.text
        d = rc.json()
        assert "razorpay_order_id" in d
        assert d["amount"] > 0
        # verify
        rv = s.post(f"{BASE_URL}/api/payments/verify",
                    json={"order_id": oid, "razorpay_payment_id": "pay_test123",
                          "razorpay_order_id": d["razorpay_order_id"],
                          "razorpay_signature": "sig_test"}, timeout=10)
        assert rv.status_code == 200
        # fetch order — payment_status should be paid
        order = s.get(f"{BASE_URL}/api/marketplace/orders/{oid}", timeout=10).json()
        assert order["payment_status"] == "paid"


# ================== 9. Shop-App Sync ==================
class TestSync:
    def test_sync_health(self):
        r = requests.get(f"{BASE_URL}/api/sync/health", timeout=10)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_sync_pull_orders(self):
        sid = STATE["shop_owner_shop_id"]
        r = requests.get(f"{BASE_URL}/api/sync/shop/{sid}/orders", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_sync_push_products_bulk(self):
        sid = STATE["shop_owner_shop_id"]
        payload = {"products": [
            {"name": "TEST_SyncProduct_1", "price": 55, "stock": 10, "category": "grocery"},
            {"name": "TEST_SyncProduct_2", "price": 77, "stock": 20, "category": "grocery"},
        ]}
        r = requests.post(f"{BASE_URL}/api/sync/shop/{sid}/products",
                          json=payload, timeout=10)
        assert r.status_code == 200
        assert r.json()["upserted"] == 2

    def test_sync_push_inventory(self):
        sid = STATE["shop_owner_shop_id"]
        # get an existing product id
        r0 = requests.get(f"{BASE_URL}/api/marketplace/shops/{sid}", timeout=10).json()
        pid = r0["products"][0]["product_id"]
        payload = {"items": [{"product_id": pid, "stock": 999}]}
        r = requests.post(f"{BASE_URL}/api/sync/shop/{sid}/inventory",
                          json=payload, timeout=10)
        assert r.status_code == 200

    def test_sync_order_status(self):
        # use payment test order which is currently "placed"
        # find an order id from admin listing
        admin_s = STATE["admin_session"]
        orders = admin_s.get(f"{BASE_URL}/api/admin/orders", timeout=10).json()
        oid = orders[-1]["order_id"]  # any order
        r = requests.post(f"{BASE_URL}/api/sync/order/{oid}/status",
                          json={"status": "accepted"}, timeout=10)
        assert r.status_code == 200


# ================== 10. Brute-force lockout ==================
class TestBruteForce:
    def test_lockout_after_5_fails(self):
        s = new_session()
        # use a bogus email so we don't lock a real account
        email = f"lockout_{uuid.uuid4().hex[:6]}@example.com"
        codes = []
        # 8 attempts to give the counter room to trip the >=5 lockout check
        for i in range(8):
            r = s.post(f"{BASE_URL}/api/auth/login",
                       json={"email": email, "password": "wrongPW"}, timeout=10)
            codes.append(r.status_code)
        assert 429 in codes, f"Expected 429 in codes {codes}"
