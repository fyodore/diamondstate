from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    ContentBlock,
    FormDefinition,
    FormField,
    FormSubmission,
    Page,
    PageBlock,
    SiteSettings,
)
from .serializers import (
    ContentBlockSerializer,
    FormDefinitionSerializer,
    FormDefinitionWriteSerializer,
    FormFieldSerializer,
    FormSubmissionSerializer,
    FormSubmitSerializer,
    PageDetailSerializer,
    PageListSerializer,
    PageWriteSerializer,
    PageBlockSerializer,
    SiteSettingsSerializer,
)


class SiteSettingsView(APIView):
    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH"):
            return [IsAdminUser()]
        return [AllowAny()]

    def get(self, request):
        settings_obj = SiteSettings.get_solo()
        return Response(
            SiteSettingsSerializer(settings_obj, context={"request": request}).data
        )

    def put(self, request):
        return self._update(request)

    def patch(self, request):
        return self._update(request)

    def _update(self, request):
        settings_obj = SiteSettings.get_solo()
        serializer = SiteSettingsSerializer(
            settings_obj,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PageViewSet(viewsets.ModelViewSet):
    queryset = Page.objects.all().prefetch_related("page_blocks__block")
    lookup_field = "slug"

    def get_permissions(self):
        if self.action in ("list", "retrieve", "by_slug_public"):
            return [AllowAny()]
        return [IsAdminUser()]

    def get_serializer_class(self):
        if self.action == "list":
            return PageListSerializer
        if self.action in ("create", "update", "partial_update"):
            return PageWriteSerializer
        return PageDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_authenticated or not self.request.user.is_staff:
            qs = qs.filter(is_published=True)
        return qs

    @action(detail=True, methods=["put"], url_path="blocks")
    def set_blocks(self, request, slug=None):
        page = self.get_object()
        items = request.data if isinstance(request.data, list) else request.data.get("blocks", [])
        page.page_blocks.all().delete()
        created = []
        for index, item in enumerate(items):
            block_id = item.get("block_id") or item.get("block")
            block = get_object_or_404(ContentBlock, pk=block_id)
            pb = PageBlock.objects.create(
                page=page,
                block=block,
                order=item.get("order", index),
                override=item.get("override") or {},
            )
            created.append(pb)
        return Response(PageBlockSerializer(created, many=True).data)


class ContentBlockViewSet(viewsets.ModelViewSet):
    queryset = ContentBlock.objects.all()
    serializer_class = ContentBlockSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAdminUser()]

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_authenticated or not self.request.user.is_staff:
            qs = qs.filter(is_active=True)
        return qs


class FormDefinitionViewSet(viewsets.ModelViewSet):
    queryset = FormDefinition.objects.prefetch_related("fields").all()
    lookup_field = "slug"

    def get_permissions(self):
        if self.action in ("list", "retrieve", "submit"):
            return [AllowAny()]
        return [IsAdminUser()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return FormDefinitionWriteSerializer
        return FormDefinitionSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_authenticated or not self.request.user.is_staff:
            qs = qs.filter(is_active=True)
        return qs

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, slug=None):
        form = self.get_object()
        if not form.is_active:
            return Response({"detail": "Form is not active."}, status=400)
        serializer = FormSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data["payload"]
        errors = {}
        for field in form.fields.all():
            value = payload.get(field.field_key)
            if field.field_type == FormField.FieldType.MULTICHECKBOX:
                if not isinstance(value, list):
                    value = [] if value in (None, "") else [value]
                    payload[field.field_key] = value
                if field.required and len(value) == 0:
                    errors[field.field_key] = "Select at least one option."
                allowed = set(field.options or [])
                if allowed and any(item not in allowed for item in value):
                    errors[field.field_key] = "Invalid option selected."
                continue
            if field.required and (value is None or value == "" or value is False):
                errors[field.field_key] = "This field is required."
            if field.field_type == FormField.FieldType.EMAIL and value:
                if "@" not in str(value):
                    errors[field.field_key] = "Enter a valid email."
            if field.field_type == FormField.FieldType.SELECT and value:
                allowed = set(field.options or [])
                if allowed and value not in allowed:
                    errors[field.field_key] = "Invalid option selected."
        if errors:
            return Response({"errors": errors}, status=400)
        submission = FormSubmission.objects.create(
            form=form,
            payload=payload,
            source_page=serializer.validated_data.get("source_page", ""),
        )
        # Email hook reserved for later when form.email_enabled is True.
        return Response(
            {
                "success": True,
                "message": form.success_message,
                "id": submission.id,
            },
            status=status.HTTP_201_CREATED,
        )


class FormFieldViewSet(viewsets.ModelViewSet):
    queryset = FormField.objects.select_related("form").all()
    serializer_class = FormFieldSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = super().get_queryset()
        form_slug = self.request.query_params.get("form")
        if form_slug:
            qs = qs.filter(form__slug=form_slug)
        return qs


class FormSubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FormSubmission.objects.select_related("form").all()
    serializer_class = FormSubmissionSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = super().get_queryset()
        form_slug = self.request.query_params.get("form")
        if form_slug:
            qs = qs.filter(form__slug=form_slug)
        return qs


@api_view(["GET"])
@permission_classes([AllowAny])
def nav_pages(request):
    pages = Page.objects.filter(is_published=True, show_in_nav=True).order_by(
        "nav_order", "title"
    )
    return Response(PageListSerializer(pages, many=True).data)
