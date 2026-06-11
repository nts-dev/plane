# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Python imports
import os

import requests

# Module imports
from plane.authentication.adapter.credential import CredentialAdapter
from plane.authentication.adapter.error import (
    AUTHENTICATION_ERROR_CODES,
    AuthenticationException,
)


class ExternalAuthProvider(CredentialAdapter):
    provider = "external"

    def __init__(self, request, contact_id=None, password=None, callback=None):
        super().__init__(request=request, provider=self.provider, callback=callback)
        self.contact_id = contact_id
        self.code = password
        self.login_url = os.environ.get(
            "EXTERNAL_AUTH_LOGIN_URL",
            "https://react.nts.nl/documents/api/v1/auth/plane-login",
        )
        self.timeout = int(os.environ.get("EXTERNAL_AUTH_TIMEOUT", "10"))
        self.ca_bundle = os.environ.get("EXTERNAL_AUTH_CA_BUNDLE")
        self.verify_ssl = os.environ.get("EXTERNAL_AUTH_VERIFY_SSL", "1").lower() not in [
            "0",
            "false",
            "no",
        ]

    def set_user_data(self):
        if not self.contact_id:
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["REQUIRED_EMAIL_PASSWORD_SIGN_IN"],
                error_message="REQUIRED_EMAIL_PASSWORD_SIGN_IN",
            )

        try:
            contact_id = int(str(self.contact_id).strip())
        except (TypeError, ValueError):
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["REQUIRED_EMAIL_PASSWORD_SIGN_IN"],
                error_message="REQUIRED_EMAIL_PASSWORD_SIGN_IN",
            )

        try:
            response = requests.post(
                self.login_url,
                json={"contactId": contact_id},
                timeout=self.timeout,
                verify=self.ca_bundle or self.verify_ssl,
            )
        except requests.RequestException as exc:
            self.logger.exception("External authentication request failed: %s", exc)
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["AUTHENTICATION_FAILED_SIGN_IN"],
                error_message="AUTHENTICATION_FAILED_SIGN_IN",
            )

        if response.status_code == 401:
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["AUTHENTICATION_FAILED_SIGN_IN"],
                error_message="AUTHENTICATION_FAILED_SIGN_IN",
            )

        if response.status_code == 403:
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["USER_ACCOUNT_DEACTIVATED"],
                error_message="USER_ACCOUNT_DEACTIVATED",
            )

        if response.status_code == 400:
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["REQUIRED_EMAIL_PASSWORD_SIGN_IN"],
                error_message="REQUIRED_EMAIL_PASSWORD_SIGN_IN",
            )

        try:
            response.raise_for_status()
            external_user = response.json()
        except (requests.RequestException, ValueError) as exc:
            self.logger.exception("External authentication returned an invalid response: %s", exc)
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["AUTHENTICATION_FAILED_SIGN_IN"],
                error_message="AUTHENTICATION_FAILED_SIGN_IN",
            )

        if not external_user.get("active", False):
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["USER_ACCOUNT_DEACTIVATED"],
                error_message="USER_ACCOUNT_DEACTIVATED",
            )

        email = external_user.get("email")
        self.sanitize_email(email)

        super().set_user_data({
            "email": email,
            "user": {
                "avatar": external_user.get("avatar", ""),
                "first_name": external_user.get("first_name", ""),
                "last_name": external_user.get("last_name", ""),
                "display_name": external_user.get("display_name", ""),
                "provider_id": str(external_user.get("id", contact_id)),
                "is_password_autoset": True,
            },
        })

    def authenticate(self):
        self.set_user_data()
        user = self.complete_login_or_signup()

        display_name = self.user_data.get("user", {}).get("display_name", "")
        if display_name:
            user.display_name = display_name
        user.is_email_verified = True
        user.is_password_autoset = True
        user.save()

        return user
