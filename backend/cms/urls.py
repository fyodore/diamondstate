from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ContentBlockViewSet,
    FormDefinitionViewSet,
    FormFieldViewSet,
    FormSubmissionViewSet,
    PageViewSet,
    SiteSettingsView,
    nav_pages,
)

router = DefaultRouter()
router.register("pages", PageViewSet, basename="page")
router.register("blocks", ContentBlockViewSet, basename="block")
router.register("forms", FormDefinitionViewSet, basename="form")
router.register("form-fields", FormFieldViewSet, basename="form-field")
router.register("submissions", FormSubmissionViewSet, basename="submission")

urlpatterns = [
    path("settings/", SiteSettingsView.as_view(), name="site-settings"),
    path("nav/", nav_pages, name="nav-pages"),
    path("", include(router.urls)),
]
