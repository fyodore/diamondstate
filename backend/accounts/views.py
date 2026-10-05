import json

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db.models import Count
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

User = get_user_model()


def _user_payload(user):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "is_active": user.is_active,
    }


def _staff_user_payload(user):
    return {
        **_user_payload(user),
        "passkey_count": getattr(user, "passkey_count", user.webauthn_credentials.count()),
        "date_joined": user.date_joined,
        "last_login": user.last_login,
    }


def _password_errors(password, user=None):
    try:
        validate_password(password, user=user)
    except ValidationError as exc:
        return list(exc.messages)
    return []


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


@api_view(["GET", "POST"])
@permission_classes([IsAdminUser])
def staff_users(request):
    if request.method == "GET":
        users = (
            User.objects.filter(is_staff=True)
            .annotate(passkey_count=Count("webauthn_credentials"))
            .order_by("username")
        )
        return Response([_staff_user_payload(u) for u in users])

    username = (request.data.get("username") or "").strip()
    email = (request.data.get("email") or "").strip()
    password = request.data.get("password") or ""
    is_superuser = bool(request.data.get("is_superuser"))

    if not username:
        return Response({"detail": "Username is required."}, status=400)
    if not password:
        return Response({"detail": "Password is required."}, status=400)
    if User.objects.filter(username__iexact=username).exists():
        return Response({"detail": "That username is already taken."}, status=400)
    if is_superuser and not request.user.is_superuser:
        return Response(
            {"detail": "Only superusers can create other superusers."},
            status=403,
        )

    user = User(username=username, email=email, is_staff=True, is_superuser=is_superuser)
    errors = _password_errors(password, user=user)
    if errors:
        return Response({"detail": errors[0], "errors": errors}, status=400)

    user.set_password(password)
    user.save()
    user.passkey_count = 0
    return Response(_staff_user_payload(user), status=201)


@api_view(["PATCH"])
@permission_classes([IsAdminUser])
def staff_user_detail(request, user_id):
    target = User.objects.filter(pk=user_id, is_staff=True).first()
    if not target:
        return Response({"detail": "Admin user not found."}, status=404)

    if "is_active" in request.data:
        is_active = bool(request.data.get("is_active"))
        if target.id == request.user.id and not is_active:
            return Response({"detail": "You cannot deactivate your own account."}, status=400)
        if target.is_superuser and not request.user.is_superuser:
            return Response(
                {"detail": "Only superusers can change other superusers."},
                status=403,
            )
        target.is_active = is_active

    if "email" in request.data:
        target.email = (request.data.get("email") or "").strip()

    if "is_superuser" in request.data:
        if not request.user.is_superuser:
            return Response(
                {"detail": "Only superusers can change superuser status."},
                status=403,
            )
        if target.id == request.user.id and not bool(request.data.get("is_superuser")):
            return Response(
                {"detail": "You cannot remove your own superuser status."},
                status=400,
            )
        target.is_superuser = bool(request.data.get("is_superuser"))

    password = request.data.get("password")
    if password:
        if target.id != request.user.id and not request.user.is_superuser:
            return Response(
                {"detail": "Only superusers can reset another admin's password."},
                status=403,
            )
        errors = _password_errors(password, user=target)
        if errors:
            return Response({"detail": errors[0], "errors": errors}, status=400)
        target.set_password(password)

    target.save()
    if password and target.id == request.user.id:
        update_session_auth_hash(request, target)

    target.passkey_count = target.webauthn_credentials.count()
    return Response(_staff_user_payload(target))


@api_view(["POST"])
@permission_classes([IsAdminUser])
def change_own_password(request):
    current_password = request.data.get("current_password") or ""
    new_password = request.data.get("new_password") or ""
    if not request.user.check_password(current_password):
        return Response({"detail": "Current password is incorrect."}, status=400)
    errors = _password_errors(new_password, user=request.user)
    if errors:
        return Response({"detail": errors[0], "errors": errors}, status=400)
    request.user.set_password(new_password)
    request.user.save(update_fields=["password"])
    update_session_auth_hash(request, request.user)
    return Response({"ok": True})
