from django.conf import settings
from django.db import models


class WebAuthnCredential(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="webauthn_credentials",
    )
    credential_id = models.CharField(max_length=512, unique=True)
    public_key = models.TextField()
    sign_count = models.BigIntegerField(default=0)
    device_name = models.CharField(max_length=200, blank=True, default="Passkey")
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username}: {self.device_name}"
