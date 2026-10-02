import json

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    options_to_json,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import bytes_to_base64url, base64url_to_bytes
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from .models import WebAuthnCredential


def _user_payload(user):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
    }


@api_view(["GET"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf(request):
    return Response({"csrfToken": get_token(request)})


@api_view(["GET"])
@permission_classes([AllowAny])
def me(request):
    if not request.user.is_authenticated:
        return Response({"authenticated": False})
    return Response({"authenticated": True, "user": _user_payload(request.user)})


@api_view(["POST"])
@permission_classes([AllowAny])
def password_login(request):
    username = request.data.get("username", "").strip()
    password = request.data.get("password", "")
    user = authenticate(request, username=username, password=password)
    if user is None or not user.is_staff:
        return Response(
            {"detail": "Invalid credentials or not an admin."},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    login(request, user)
    return Response({"authenticated": True, "user": _user_payload(user)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response({"ok": True})


@api_view(["POST"])
@permission_classes([IsAdminUser])
def passkey_register_options(request):
    user = request.user
    existing = [
        PublicKeyCredentialDescriptor(id=base64url_to_bytes(c.credential_id))
        for c in user.webauthn_credentials.all()
    ]
    options = generate_registration_options(
        rp_id=settings.WEBAUTHN_RP_ID,
        rp_name=settings.WEBAUTHN_RP_NAME,
        user_id=str(user.id).encode("utf-8"),
        user_name=user.username,
        user_display_name=user.get_full_name() or user.username,
        exclude_credentials=existing,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
    )
    request.session["webauthn_register_challenge"] = bytes_to_base64url(options.challenge)
    return Response(json.loads(options_to_json(options)))


@api_view(["POST"])
@permission_classes([IsAdminUser])
def passkey_register_verify(request):
    challenge = request.session.get("webauthn_register_challenge")
    if not challenge:
        return Response({"detail": "Missing registration challenge."}, status=400)
    try:
        verification = verify_registration_response(
            credential=request.data,
            expected_challenge=base64url_to_bytes(challenge),
            expected_rp_id=settings.WEBAUTHN_RP_ID,
            expected_origin=settings.WEBAUTHN_ORIGIN,
        )
    except Exception as exc:
        return Response({"detail": str(exc)}, status=400)

    credential_id = bytes_to_base64url(verification.credential_id)
    public_key = bytes_to_base64url(verification.credential_public_key)
    device_name = request.data.get("device_name") or "Passkey"
    WebAuthnCredential.objects.create(
        user=request.user,
        credential_id=credential_id,
        public_key=public_key,
        sign_count=verification.sign_count,
        device_name=device_name,
    )
    request.session.pop("webauthn_register_challenge", None)
    return Response({"ok": True, "credential_id": credential_id})


@api_view(["POST"])
@permission_classes([AllowAny])
def passkey_login_options(request):
    username = (request.data.get("username") or "").strip()
    qs = WebAuthnCredential.objects.select_related("user")
    if username:
        qs = qs.filter(user__username=username, user__is_staff=True)
    else:
        qs = qs.filter(user__is_staff=True)

    allow_credentials = [
        PublicKeyCredentialDescriptor(id=base64url_to_bytes(c.credential_id))
        for c in qs
    ]
    options = generate_authentication_options(
        rp_id=settings.WEBAUTHN_RP_ID,
        allow_credentials=allow_credentials or None,
        user_verification=UserVerificationRequirement.PREFERRED,
    )
    request.session["webauthn_login_challenge"] = bytes_to_base64url(options.challenge)
    return Response(json.loads(options_to_json(options)))


@api_view(["POST"])
@permission_classes([AllowAny])
def passkey_login_verify(request):
    challenge = request.session.get("webauthn_login_challenge")
    if not challenge:
        return Response({"detail": "Missing authentication challenge."}, status=400)

    raw_id = request.data.get("rawId") or request.data.get("id")
    if not raw_id:
        return Response({"detail": "Missing credential id."}, status=400)

    credential = WebAuthnCredential.objects.filter(credential_id=raw_id).select_related(
        "user"
    ).first()
    if not credential or not credential.user.is_staff:
        return Response({"detail": "Unknown passkey."}, status=401)

    try:
        verification = verify_authentication_response(
            credential=request.data,
            expected_challenge=base64url_to_bytes(challenge),
            expected_rp_id=settings.WEBAUTHN_RP_ID,
            expected_origin=settings.WEBAUTHN_ORIGIN,
            credential_public_key=base64url_to_bytes(credential.public_key),
            credential_current_sign_count=credential.sign_count,
        )
    except Exception as exc:
        return Response({"detail": str(exc)}, status=400)

    credential.sign_count = verification.new_sign_count
    credential.last_used_at = timezone.now()
    credential.save(update_fields=["sign_count", "last_used_at"])
    login(request, credential.user)
    request.session.pop("webauthn_login_challenge", None)
    return Response({"authenticated": True, "user": _user_payload(credential.user)})


@api_view(["GET"])
@permission_classes([IsAdminUser])
def list_passkeys(request):
    creds = request.user.webauthn_credentials.all()
    return Response(
        [
            {
                "id": c.id,
                "device_name": c.device_name,
                "created_at": c.created_at,
                "last_used_at": c.last_used_at,
            }
            for c in creds
        ]
    )
