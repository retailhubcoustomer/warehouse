"""Pydantic models for the multi-city warehouse marketplace."""
from datetime import datetime, timezone
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, EmailStr, ConfigDict
import uuid


def gen_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


Role = Literal[
    "super_admin",
    "warehouse_manager",
    "shop_owner",
    "customer",
    "delivery_partner",
    "collection_partner",
]

OrderStatus = Literal[
    "placed",
    "accepted",
    "collected",
    "at_warehouse",
    "packed",
    "out_for_delivery",
    "delivered",
    "cancelled",
]


class Base(BaseModel):
    model_config = ConfigDict(extra="ignore")


# ---------------- Users ----------------
class UserPublic(Base):
    user_id: str
    email: EmailStr
    name: str
    role: Role
    phone: Optional[str] = None
    picture: Optional[str] = None
    warehouse_id: Optional[str] = None
    shop_id: Optional[str] = None
    city_id: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    kyc_status: str = "pending"
    is_active: bool = True
    created_at: datetime = Field(default_factory=now_utc)


class RegisterRequest(Base):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    role: Role = "customer"
    phone: Optional[str] = None
    city_id: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class LoginRequest(Base):
    email: EmailStr
    password: str


class SelectRoleRequest(Base):
    role: Role


# ---------------- Cities ----------------
class CityCreate(Base):
    name: str
    state: str = "West Bengal"
    lat: float
    lng: float


class City(CityCreate):
    city_id: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=now_utc)


# ---------------- Warehouses ----------------
class WarehouseCreate(Base):
    name: str
    code: str
    city_id: str
    address: str
    lat: float
    lng: float
    capacity: int = 1000
    service_radius_km: float = 25.0


class Warehouse(WarehouseCreate):
    warehouse_id: str
    manager_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=now_utc)


# ---------------- Shops ----------------
class ShopCreate(Base):
    name: str
    city_id: str
    address: str
    lat: float
    lng: float
    category: str = "grocery"
    image_url: Optional[str] = None
    business_hours: str = "9:00 AM - 10:00 PM"


class Shop(ShopCreate):
    shop_id: str
    owner_id: Optional[str] = None
    rating: float = 4.2
    reviews_count: int = 0
    is_active: bool = True
    warehouse_id: Optional[str] = None  # nearest warehouse
    created_at: datetime = Field(default_factory=now_utc)


# ---------------- Products ----------------
class ProductCreate(Base):
    name: str
    description: str = ""
    price: float
    stock: int = 100
    category: str = "general"
    image_url: Optional[str] = None


class Product(ProductCreate):
    product_id: str
    shop_id: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=now_utc)


# ---------------- Orders ----------------
class CartItem(Base):
    product_id: str
    name: str
    price: float
    qty: int
    image_url: Optional[str] = None


class OrderCreate(Base):
    shop_id: str
    items: List[CartItem]
    delivery_address: str
    delivery_lat: float
    delivery_lng: float
    payment_method: Literal["cod", "razorpay"] = "cod"
    coupon_code: Optional[str] = None
    notes: Optional[str] = None


class TimelineEvent(Base):
    at: datetime = Field(default_factory=now_utc)
    status: str
    note: Optional[str] = None


class Order(Base):
    order_id: str
    customer_id: str
    customer_name: str
    shop_id: str
    shop_name: str
    warehouse_id: str
    warehouse_name: str
    city_id: str
    items: List[CartItem]
    subtotal: float
    delivery_fee: float = 30.0
    discount: float = 0.0
    total: float
    status: OrderStatus = "placed"
    delivery_address: str
    delivery_lat: float
    delivery_lng: float
    payment_method: str = "cod"
    payment_status: str = "pending"
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    collection_partner_id: Optional[str] = None
    delivery_partner_id: Optional[str] = None
    rating: Optional[int] = None
    review: Optional[str] = None
    timeline: List[TimelineEvent] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)


# ---------------- Coupons & Ads ----------------
class CouponCreate(Base):
    code: str
    discount_percent: float
    min_order: float = 0
    max_discount: float = 500
    expires_at: Optional[datetime] = None


class Coupon(CouponCreate):
    coupon_id: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=now_utc)


class AdCreate(Base):
    title: str
    image_url: str
    target_url: Optional[str] = None
    city_id: Optional[str] = None


class Ad(AdCreate):
    ad_id: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=now_utc)


class RatingRequest(Base):
    rating: int = Field(ge=1, le=5)
    review: Optional[str] = None


class KYCUpdate(Base):
    status: Literal["approved", "rejected", "pending"]
    note: Optional[str] = None
