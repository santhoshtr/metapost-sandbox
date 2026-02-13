/**
 * GitHub OAuth authentication module
 * Handles OAuth flow and token management via cookies
 */

const GITHUB_CLIENT_ID = "Ov23liODMv04EN1hNpy3";
const GITHUB_OAUTH_URL = "https://github.com/login/oauth/authorize";

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
	return !!localStorage.getItem("github_user");
}

/**
 * Get current user info from localStorage
 * @returns {Object|null}
 */
export function getCurrentUser() {
	const user = localStorage.getItem("github_user");
	return user ? JSON.parse(user) : null;
}

/**
 * Initiate GitHub OAuth login
 * Redirects to GitHub authorization page
 */
export function initiateLogin() {
	const params = new URLSearchParams({
		client_id: GITHUB_CLIENT_ID,
		scope: "gist",
		redirect_uri: window.location.origin + "/",
	});

	window.location.href = `${GITHUB_OAUTH_URL}?${params.toString()}`;
}

/**
 * Handle OAuth callback
 * Exchanges authorization code for access token via backend
 * @param {string} code - Authorization code from GitHub
 * @returns {Promise<Object>} User info
 */
export async function handleCallback(code) {
	const response = await fetch("/api/auth/github/callback", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ code }),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Authentication failed");
	}

	const user = await response.json();
	localStorage.setItem("github_user", JSON.stringify(user));

	// Clear the code from URL
	window.history.replaceState({}, document.title, "/");

	return user;
}

/**
 * Logout user
 * Clears cookie and localStorage
 */
export async function logout() {
	await fetch("/api/auth/logout", { method: "POST" });
	localStorage.removeItem("github_user");
	window.location.href = "/";
}

/**
 * Check for OAuth callback on page load
 * Should be called when app initializes
 * @returns {Promise<Object|null>} User if callback was handled, null otherwise
 */
export async function checkAuthCallback() {
	const urlParams = new URLSearchParams(window.location.search);
	const code = urlParams.get("code");

	if (code) {
		try {
			const user = await handleCallback(code);
			return user;
		} catch (error) {
			console.error("OAuth callback failed:", error);
			return null;
		}
	}

	return null;
}
