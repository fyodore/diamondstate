from django.db import models
from django.contrib.auth import get_user_model
from django.utils.text import slugify


User = get_user_model()


class SiteSettings(models.Model):
    league_name = models.CharField(max_length=200, default="Diamond State Softball League")
    location = models.CharField(max_length=200, default="Little Rock, Arkansas")
    motto = models.CharField(max_length=200, default="Play · Support · Belong")
    logo = models.ImageField(upload_to="branding/", blank=True, null=True)
    facebook_url = models.URLField(blank=True)
    instagram_url = models.URLField(blank=True)
    threads_url = models.URLField(blank=True)
    x_url = models.URLField(blank=True, help_text="X (formerly Twitter)")
    bluesky_url = models.URLField(blank=True)
    youtube_url = models.URLField(blank=True)
    notify_email = models.EmailField(
        blank=True,
        help_text="Reserved for future interest-form email notifications.",
    )
    email_enabled = models.BooleanField(
        default=False,
        help_text="When enabled later, interest submissions can email notify_email.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Site settings"
        verbose_name_plural = "Site settings"

    def __str__(self):
        return self.league_name

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class Page(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    nav_label = models.CharField(max_length=100)
    is_published = models.BooleanField(default=True)
    show_in_nav = models.BooleanField(default=True)
    nav_order = models.PositiveIntegerField(default=0)
    meta_description = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nav_order", "title"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)


class ContentBlock(models.Model):
    class BlockType(models.TextChoices):
        HERO = "hero", "Hero"
        RICH_TEXT = "rich_text", "Rich text"
        IMAGE = "image", "Image"
        FORM = "form", "Form"
        CTA = "cta", "Call to action"

    name = models.CharField(max_length=200)
    block_type = models.CharField(max_length=30, choices=BlockType.choices)
    content = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.block_type})"


class PageBlock(models.Model):
    page = models.ForeignKey(Page, on_delete=models.CASCADE, related_name="page_blocks")
    block = models.ForeignKey(
        ContentBlock, on_delete=models.CASCADE, related_name="page_placements"
    )
    order = models.PositiveIntegerField(default=0)
    override = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["order", "id"]
        unique_together = [("page", "block")]

    def __str__(self):
        return f"{self.page.slug} -> {self.block.name}"


class FormDefinition(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    intro_text = models.TextField(blank=True)
    success_message = models.CharField(
        max_length=300, default="Thanks for your interest! We will be in touch."
    )
    is_active = models.BooleanField(default=True)
    # Reserved for later email notifications
    notify_email = models.EmailField(blank=True)
    email_enabled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class FormField(models.Model):
    class FieldType(models.TextChoices):
        TEXT = "text", "Text"
        EMAIL = "email", "Email"
        PHONE = "phone", "Phone"
        TEXTAREA = "textarea", "Textarea"
        SELECT = "select", "Select"
        CHECKBOX = "checkbox", "Checkbox"
        MULTICHECKBOX = "multicheckbox", "Multi-checkbox"
        NUMBER = "number", "Number"

    form = models.ForeignKey(
        FormDefinition, on_delete=models.CASCADE, related_name="fields"
    )
    label = models.CharField(max_length=200)
    field_key = models.SlugField(max_length=100)
    field_type = models.CharField(max_length=20, choices=FieldType.choices)
    options = models.JSONField(
        default=list,
        blank=True,
        help_text='For select / multi-checkbox fields: ["Option A", "Option B"]',
    )
    required = models.BooleanField(default=True)
    placeholder = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]
        unique_together = [("form", "field_key")]

    def __str__(self):
        return f"{self.form.slug}.{self.field_key}"


class FormSubmission(models.Model):
    form = models.ForeignKey(
        FormDefinition, on_delete=models.CASCADE, related_name="submissions"
    )
    payload = models.JSONField(default=dict)
    source_page = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.form.slug} @ {self.created_at:%Y-%m-%d %H:%M}"
