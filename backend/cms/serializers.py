from rest_framework import serializers

from .models import (
    ContentBlock,
    FormDefinition,
    FormField,
    FormSubmission,
    Page,
    PageBlock,
    SiteSettings,
)


class SiteSettingsSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    clear_logo = serializers.BooleanField(required=False, write_only=True, default=False)

    class Meta:
        model = SiteSettings
        fields = [
            "league_name",
            "location",
            "motto",
            "logo",
            "logo_url",
            "clear_logo",
            "facebook_url",
            "instagram_url",
            "threads_url",
            "x_url",
            "bluesky_url",
            "youtube_url",
            "notify_email",
            "email_enabled",
            "updated_at",
        ]
        read_only_fields = ["updated_at", "logo_url"]
        extra_kwargs = {
            "logo": {"required": False, "allow_null": True},
        }

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        request = self.context.get("request")
        url = obj.logo.url
        if request:
            return request.build_absolute_uri(url)
        return url

    def update(self, instance, validated_data):
        clear_logo = validated_data.pop("clear_logo", False)
        logo = validated_data.pop("logo", serializers.empty)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if clear_logo and logo is serializers.empty:
            if instance.logo:
                instance.logo.delete(save=False)
            instance.logo = None
        elif logo is not serializers.empty:
            if instance.logo and instance.logo != logo:
                instance.logo.delete(save=False)
            instance.logo = logo

        instance.save()
        return instance


class FormFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormField
        fields = [
            "id",
            "form",
            "label",
            "field_key",
            "field_type",
            "options",
            "required",
            "placeholder",
            "order",
        ]
        read_only_fields = ["id"]


class FormDefinitionSerializer(serializers.ModelSerializer):
    fields = FormFieldSerializer(many=True, read_only=True)

    class Meta:
        model = FormDefinition
        fields = [
            "id",
            "name",
            "slug",
            "intro_text",
            "success_message",
            "is_active",
            "notify_email",
            "email_enabled",
            "fields",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "fields"]


class FormDefinitionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormDefinition
        fields = [
            "id",
            "name",
            "slug",
            "intro_text",
            "success_message",
            "is_active",
            "notify_email",
            "email_enabled",
        ]
        read_only_fields = ["id"]


class ContentBlockSerializer(serializers.ModelSerializer):
    form_detail = serializers.SerializerMethodField()

    class Meta:
        model = ContentBlock
        fields = [
            "id",
            "name",
            "block_type",
            "content",
            "is_active",
            "form_detail",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "form_detail"]

    def get_form_detail(self, obj):
        if obj.block_type != ContentBlock.BlockType.FORM:
            return None
        form_slug = (obj.content or {}).get("form_slug")
        if not form_slug:
            return None
        form = FormDefinition.objects.filter(slug=form_slug, is_active=True).first()
        if not form:
            return None
        return FormDefinitionSerializer(form, context=self.context).data


class PageBlockSerializer(serializers.ModelSerializer):
    block = ContentBlockSerializer(read_only=True)
    block_id = serializers.PrimaryKeyRelatedField(
        queryset=ContentBlock.objects.all(), source="block", write_only=True
    )

    class Meta:
        model = PageBlock
        fields = ["id", "page", "block", "block_id", "order", "override"]
        read_only_fields = ["id"]


class PageListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = [
            "id",
            "title",
            "slug",
            "nav_label",
            "is_published",
            "show_in_nav",
            "nav_order",
            "meta_description",
            "updated_at",
        ]


class PageDetailSerializer(serializers.ModelSerializer):
    page_blocks = PageBlockSerializer(many=True, read_only=True)

    class Meta:
        model = Page
        fields = [
            "id",
            "title",
            "slug",
            "nav_label",
            "is_published",
            "show_in_nav",
            "nav_order",
            "meta_description",
            "page_blocks",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "page_blocks"]


class PageWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = [
            "id",
            "title",
            "slug",
            "nav_label",
            "is_published",
            "show_in_nav",
            "nav_order",
            "meta_description",
        ]
        read_only_fields = ["id"]


class FormSubmissionSerializer(serializers.ModelSerializer):
    form_name = serializers.CharField(source="form.name", read_only=True)

    class Meta:
        model = FormSubmission
        fields = ["id", "form", "form_name", "payload", "source_page", "created_at"]
        read_only_fields = ["id", "created_at", "form_name"]


class FormSubmitSerializer(serializers.Serializer):
    payload = serializers.DictField()
    source_page = serializers.CharField(required=False, allow_blank=True, default="")
