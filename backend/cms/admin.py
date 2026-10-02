from django.contrib import admin

from .models import (
    ContentBlock,
    FormDefinition,
    FormField,
    FormSubmission,
    Page,
    PageBlock,
    SiteSettings,
)


class PageBlockInline(admin.TabularInline):
    model = PageBlock
    extra = 0


class FormFieldInline(admin.TabularInline):
    model = FormField
    extra = 0


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    list_display = ("league_name", "location", "email_enabled", "updated_at")
    fieldsets = (
        (
            None,
            {"fields": ("league_name", "location", "motto", "logo")},
        ),
        (
            "Social media",
            {
                "fields": (
                    "facebook_url",
                    "instagram_url",
                    "threads_url",
                    "x_url",
                    "bluesky_url",
                    "youtube_url",
                )
            },
        ),
        (
            "Notifications",
            {"fields": ("notify_email", "email_enabled")},
        ),
    )


@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "is_published", "show_in_nav", "nav_order")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [PageBlockInline]


@admin.register(ContentBlock)
class ContentBlockAdmin(admin.ModelAdmin):
    list_display = ("name", "block_type", "is_active", "updated_at")
    list_filter = ("block_type", "is_active")


@admin.register(FormDefinition)
class FormDefinitionAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "email_enabled")
    prepopulated_fields = {"slug": ("name",)}
    inlines = [FormFieldInline]


@admin.register(FormSubmission)
class FormSubmissionAdmin(admin.ModelAdmin):
    list_display = ("form", "source_page", "created_at")
    list_filter = ("form",)
