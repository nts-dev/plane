/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
// plane imports
import { API_BASE_URL } from "@plane/constants";
import { Spinner } from "@plane/ui";
// hooks
import { useSearchParams } from "next/navigation";
// services
import { AuthService } from "@/services/auth.service";

const authService = new AuthService();

export function ExternalAutoSignIn() {
  const searchParams = useSearchParams();
  const contactIdParam = searchParams.get("contactId") || searchParams.get("contact_id");
  const errorCode = searchParams.get("error_code");
  const nextPath = searchParams.get("next_path");
  const [failed, setFailed] = useState(false);

  const contactId = useMemo(() => {
    if (!contactIdParam) return undefined;
    const value = Number(contactIdParam);
    if (!Number.isInteger(value) || value <= 0) return undefined;
    return value.toString();
  }, [contactIdParam]);

  useEffect(() => {
    if (!contactId || errorCode) return;

    let isMounted = true;

    const submitExternalSignIn = async () => {
      try {
        const token = await authService.requestCSRFToken();
        if (!isMounted || !token?.csrf_token) return;

        const form = document.createElement("form");
        form.method = "POST";
        form.action = `${API_BASE_URL}/auth/external/sign-in/`;

        const csrfInput = document.createElement("input");
        csrfInput.type = "hidden";
        csrfInput.name = "csrfmiddlewaretoken";
        csrfInput.value = token.csrf_token;
        form.appendChild(csrfInput);

        const contactIdInput = document.createElement("input");
        contactIdInput.type = "hidden";
        contactIdInput.name = "contact_id";
        contactIdInput.value = contactId;
        form.appendChild(contactIdInput);

        if (nextPath) {
          const nextPathInput = document.createElement("input");
          nextPathInput.type = "hidden";
          nextPathInput.name = "next_path";
          nextPathInput.value = nextPath;
          form.appendChild(nextPathInput);
        }

        document.body.appendChild(form);
        form.submit();
      } catch {
        if (isMounted) setFailed(true);
      }
    };

    void submitExternalSignIn();

    return () => {
      isMounted = false;
    };
  }, [contactId, errorCode, nextPath]);

  if (!contactId || errorCode) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-surface-1 text-primary">
      {failed ? (
        <span className="text-13 text-danger-primary">Automatic sign-in failed. Please try again.</span>
      ) : (
        <>
          <Spinner height="24px" width="24px" />
          <span className="text-13 text-secondary">Signing you in...</span>
        </>
      )}
    </div>
  );
}
