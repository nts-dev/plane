# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.http import HttpResponseRedirect
from django.views import View

# Module imports
from plane.authentication.adapter.error import (
    AUTHENTICATION_ERROR_CODES,
    AuthenticationException,
)
from plane.authentication.provider.credentials.external import ExternalAuthProvider
from plane.authentication.utils.host import base_host
from plane.authentication.utils.login import user_login
from plane.authentication.utils.redirection_path import get_redirection_path
from plane.authentication.utils.user_auth_workflow import post_user_auth_workflow
from plane.license.models import Instance
from plane.utils.path_validator import get_safe_redirect_url


class ExternalSignInAuthEndpoint(View):
    def post(self, request):
        next_path = request.POST.get("next_path")

        instance = Instance.objects.first()
        if instance is None or not instance.is_setup_done:
            exc = AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["INSTANCE_NOT_CONFIGURED"],
                error_message="INSTANCE_NOT_CONFIGURED",
            )
            url = get_safe_redirect_url(
                base_url=base_host(request=request, is_app=True),
                next_path=next_path,
                params=exc.get_error_dict(),
            )
            return HttpResponseRedirect(url)

        contact_id = request.POST.get("contact_id", False)
        password = request.POST.get("password", False)

        if not contact_id or not password:
            exc = AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["REQUIRED_EMAIL_PASSWORD_SIGN_IN"],
                error_message="REQUIRED_EMAIL_PASSWORD_SIGN_IN",
            )
            url = get_safe_redirect_url(
                base_url=base_host(request=request, is_app=True),
                next_path=next_path,
                params=exc.get_error_dict(),
            )
            return HttpResponseRedirect(url)

        try:
            provider = ExternalAuthProvider(
                request=request,
                contact_id=contact_id,
                password=password,
                callback=post_user_auth_workflow,
            )
            user = provider.authenticate()
            user_login(request=request, user=user, is_app=True)
            request.session["external_contact_id"] = int(str(contact_id).strip())

            path = next_path if next_path else get_redirection_path(user=user)
            url = get_safe_redirect_url(
                base_url=base_host(request=request, is_app=True),
                next_path=path,
                params={},
            )
            return HttpResponseRedirect(url)
        except AuthenticationException as e:
            url = get_safe_redirect_url(
                base_url=base_host(request=request, is_app=True),
                next_path=next_path,
                params=e.get_error_dict(),
            )
            return HttpResponseRedirect(url)
