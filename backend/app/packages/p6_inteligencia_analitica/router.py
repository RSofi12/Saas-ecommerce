from fastapi import APIRouter

from app.packages.p6_inteligencia_analitica.routes.chatbot_routes import router as chatbot_router
from app.packages.p6_inteligencia_analitica.routes.customer_segmentation_routes import (
    router as customer_segmentation_router,
)
from app.packages.p6_inteligencia_analitica.routes.dashboard_routes import router as dashboard_router
from app.packages.p6_inteligencia_analitica.routes.demand_forecast_routes import (
    router as demand_forecast_router,
)
from app.packages.p6_inteligencia_analitica.routes.notification_routes import router as notification_router
from app.packages.p6_inteligencia_analitica.routes.recommendation_routes import router as recommendation_router
from app.packages.p6_inteligencia_analitica.routes.report_routes import router as report_router
from app.packages.p6_inteligencia_analitica.routes.synthetic_dataset_routes import router as synthetic_dataset_router
from app.packages.p6_inteligencia_analitica.routes.voice_report_routes import router as voice_report_router

p6_router = APIRouter()

p6_router.include_router(chatbot_router)
p6_router.include_router(customer_segmentation_router)
p6_router.include_router(dashboard_router)
p6_router.include_router(demand_forecast_router)
p6_router.include_router(notification_router)
p6_router.include_router(recommendation_router)
p6_router.include_router(report_router)
p6_router.include_router(synthetic_dataset_router)
p6_router.include_router(voice_report_router)
