import React, { useEffect, useRef, useState } from "react";
import {
  createNonce,
  initializeGoogleSignIn,
  loadGoogleIdentityScript,
} from "../../services/googleAuth";

export function SignInPage({ onGoogleCredential }) {
  const buttonContainerRef = useRef(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    let isCancelled = false;

    async function setupGoogleSignIn() {
      if (!clientId) {
        setError("Google sign-in is not configured. Set GOOGLE_CLIENT_ID in your environment.");
        setIsLoading(false);
        return;
      }

      try {
        const nonce = createNonce();
        window.sessionStorage.setItem("ulti-box-score-auth-nonce", nonce);
        await loadGoogleIdentityScript();

        if (isCancelled || !buttonContainerRef.current) {
          return;
        }

        initializeGoogleSignIn({
          clientId,
          nonce,
          buttonElement: buttonContainerRef.current,
          onCredential: async (credential) => {
            setError("");
            try {
              await onGoogleCredential(credential);
            } catch (credentialError) {
              setError(credentialError?.message || "Google sign-in failed.");
            }
          },
        });
      } catch (setupError) {
        setError(setupError?.message || "Unable to initialize Google sign-in.");
      } finally {
        setIsLoading(false);
      }
    }

    setupGoogleSignIn();

    return () => {
      isCancelled = true;
    };
  }, [clientId, onGoogleCredential]);

  return (
    <main className="layout auth-layout">
      <section className="panel auth-panel">
        <h1>Ultimate Frisbee Box Score</h1>
        <p className="help-text">
          Sign in with Google. Team ownership is scoped to the verified Google email.
        </p>

        <div className="auth-form">
          <div ref={buttonContainerRef} className="google-signin-container" />
          {isLoading ? <p className="help-text">Loading Google sign-in...</p> : null}
          {error ? <p className="auth-error">{error}</p> : null}
        </div>
      </section>
    </main>
  );
}
