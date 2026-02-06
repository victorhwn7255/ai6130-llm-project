from sqlalchemy import Column, Integer, String, Float, DateTime, JSON
from sqlalchemy.sql import func
from db.database import Base


class RoutingLog(Base):
    __tablename__ = "routing_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    query = Column(String, nullable=False)
    route = Column(String, nullable=False)          # "local" or "cloud"
    confidence = Column(Float, nullable=False)
    features = Column(JSON, nullable=True)
    response_text = Column(String, nullable=True)
    latency_ms = Column(Float, nullable=True)
    router_latency_ms = Column(Float, nullable=True)
    input_tokens = Column(Integer, nullable=True)
    output_tokens = Column(Integer, nullable=True)
    cost_usd = Column(Float, default=0.0)
    cloud_cost_usd = Column(Float, default=0.0)     # what it would have cost on cloud
    savings_usd = Column(Float, default=0.0)
    domain = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
