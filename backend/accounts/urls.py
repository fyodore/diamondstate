from django.urls import path

from . import views

urlpatterns = [
    path("csrf/", views.csrf, name="auth-csrf"),
    path("me/", views.me, name="auth-me"),
    path("login/", views.password_login, name="auth-login"),
    path("logout/", views.logout_view, name="auth-logout"),
    path("passkeys/", views.list_passkeys, name="auth-passkeys"),
    path(
        "passkey/register/options/",
        views.passkey_register_options,
        name="passkey-register-options",
    ),
    path(
        "passkey/register/verify/",
        views.passkey_register_verify,
        name="passkey-register-verify",
    ),
    path(
        "passkey/login/options/",
        views.passkey_login_options,
        name="passkey-login-options",
    ),
    path(
        "passkey/login/verify/",
        views.passkey_login_verify,
        name="passkey-login-verify",
    ),
]
