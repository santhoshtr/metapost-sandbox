/**
 * Main application module for Metapost Sandbox
 * Handles editor initialization, compilation, saving, and user authentication
 */

import PocketBase from "./pocketbase.es.js";
import { annotate } from "./svgannotate.js";

// DOM element references
let editor = null;
let authorId = null;
let sampleId = null;
let authData = null;
let compileAbortController = null;
let compileDebouncer = null;

const PB_URL = "https://santhosh.pockethost.io";
const COMPILE_DELAY = 500;

// Initialize PocketBase client
const pocketbaseClient = new PocketBase(PB_URL);

/**
 * Update UI after successful login
 */
function onLogin() {
	if (!authData?.record) return;

	const worksLink = document.getElementById("b-works");
	if (worksLink) {
		worksLink.href = `/u/${authData.record.username}`;
		worksLink.parentElement?.classList.remove("hidden");
	}

	const profileBtn = document.getElementById("b-profile");
	if (profileBtn) {
		const avatarImg = document.createElement("img");
		avatarImg.src = `https://github.com/${authData.record.username}.png?size=24`;
		avatarImg.width = 24;
		avatarImg.alt = "Profile";
		avatarImg.loading = "lazy";

		profileBtn.innerHTML = "";
		profileBtn.appendChild(avatarImg);
	}

	const loginBtn = document.getElementById("b-login");
	loginBtn?.parentElement?.remove();

	const logoutBtn = document.getElementById("b-logout");
	logoutBtn?.parentElement?.classList.remove("hidden");

	const saveBtn = document.getElementById("b-save");
	saveBtn?.removeAttribute("disabled");
}

/**
 * Authenticate user with GitHub OAuth
 */
async function doGithubLogin() {
	try {
		authData = await pocketbaseClient
			.collection("users")
			.authWithOAuth2({ provider: "github" });
		onLogin();
	} catch (error) {
		console.error("Login failed:", error);
		showLog(`Login failed: ${error.message}`);
	}
}

/**
 * Update browser URL without page reload
 */
function updateUrl(url, title) {
	const newUrl = `/m/${url}`;
	window.history.pushState({ data: true }, title, newUrl);
}

/**
 * Show message in log area
 */
function showLog(message) {
	const logElement = document.getElementById("log");
	if (logElement) {
		logElement.textContent = message;
	}
}

/**
 * Save current metapost code
 */
async function doSave() {
	// Trigger compile first to validate
	try {
		doCompile();
	} catch {
		// Continue even if compile fails
	}

	// Authenticate if needed
	if (!authData) {
		await doGithubLogin();
		if (!authData) return; // User cancelled login
	}

	showLog("Saving...");

	const titleElement = document.getElementById("title");
	const title = titleElement?.value?.trim() || "Untitled";

	try {
		const data = {
			author: authData.record.id,
			title,
			metapost: editor?.getValue() || "",
		};

		if (sampleId && authorId && authorId === authData.record.id) {
			await pocketbaseClient.collection("metaposts").update(sampleId, data);
			showLog(`Updated: ${sampleId}`);
		} else {
			const record = await pocketbaseClient.collection("metaposts").create(data);
			sampleId = record.id;
			authorId = authData.record.id;
			updateUrl(sampleId, title);
			showLog(`Saved: ${sampleId}`);
		}
	} catch (error) {
		console.error("Save failed:", error);
		showLog(`Save failed: ${error.message}`);
	}
}

/**
 * Logout current user
 */
function doLogout() {
	try {
		pocketbaseClient.authStore.clear();
		window.location.href = "/";
	} catch (error) {
		console.error("Logout failed:", error);
	}
}

/**
 * Export SVG as downloadable file
 */
function exportSVG() {
	const resultElement = document.getElementById("result");
	const svgEl = resultElement?.querySelector("svg");

	if (!svgEl) {
		showLog("No SVG to export");
		return;
	}

	const fileName = sampleId ? `${sampleId}.svg` : "metapost.svg";

	// Ensure SVG has proper namespace
	if (!svgEl.getAttribute("xmlns")) {
		svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
	}

	const svgData = svgEl.outerHTML;
	const preface = '<?xml version="1.0" standalone="no"?>\r\n';
	const blob = new Blob([preface, svgData], {
		type: "image/svg+xml;charset=utf-8",
	});

	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;

	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	URL.revokeObjectURL(url);
}

/**
 * Compile metapost code and display result
 */
async function doCompile() {
	if (!editor) return;

	const code = editor.getValue();
	showLog("Compiling...");

	// Cancel previous request if still pending
	if (compileAbortController) {
		compileAbortController.abort();
	}
	compileAbortController = new AbortController();

	try {
		const response = await fetch("/api/compile", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ code }),
			signal: compileAbortController.signal,
		});

		const result = await response.json();

		if (!response.ok || !result.svg) {
			showLog(`${result.stdout || ""}\n${result.stderr || ""}`.trim());
			document.getElementById("result").innerHTML = "<p>Error compiling</p>";
			return;
		}

		showLog(result.stdout || "Compiled successfully");
		document.getElementById("result").innerHTML = result.svg;

		const originalSVG = document.querySelector("#result svg");
		if (originalSVG) {
			// Expand viewBox by 10% with padding
			const width = parseFloat(originalSVG.getAttribute("width")) || 0;
			const height = parseFloat(originalSVG.getAttribute("height")) || 0;
			const newViewBox = `-20 -20 ${width * 1.1} ${height * 1.1}`;

			originalSVG.setAttribute("viewBox", newViewBox);
			originalSVG.setAttribute("id", "originalSVG");
			annotate(originalSVG);
		}
	} catch (error) {
		if (error.name === "AbortError") return;
		console.error("Compile failed:", error);
		showLog(`Compile failed: ${error.message}`);
	}
}

/**
 * Initialize the application
 */
document.addEventListener("DOMContentLoaded", async () => {
	// Cache DOM elements
	const loginBtn = document.getElementById("b-login");
	const profileBtn = document.getElementById("b-profile");
	const saveBtn = document.getElementById("b-save");
	const compileBtn = document.getElementById("b-compile");
	const logoutBtn = document.getElementById("b-logout");
	const exportBtn = document.getElementById("b-export");
	const titleElement = document.getElementById("title");

	// Attach event listeners
	loginBtn?.addEventListener("click", doGithubLogin);
	exportBtn?.addEventListener("click", exportSVG);
	compileBtn?.addEventListener("click", doCompile);
	saveBtn?.addEventListener("click", doSave);
	logoutBtn?.addEventListener("click", doLogout);

	// Title input keyboard shortcuts
	titleElement?.addEventListener("keydown", (e) => {
		if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
			e.preventDefault();
			doSave();
		} else if (e.key === "Enter") {
			e.preventDefault();
			doSave();
		}
	});

	// Initialize CodeMirror
	const textarea = document.getElementById("metapost");
	if (window.CodeMirror && textarea) {
		editor = CodeMirror.fromTextArea(textarea, {
			lineNumbers: true,
			mode: "metapost",
			theme: "nord",
			extraKeys: {
				"Ctrl-S": doSave,
				"Ctrl-R": doCompile,
			},
		});

		// Debounced auto-compile
		editor.on("change", () => {
			clearTimeout(compileDebouncer);
			compileDebouncer = setTimeout(doCompile, COMPILE_DELAY);
		});

		// Load sample data from meta tags
		sampleId = document
			.querySelector("meta[name='sampleid']")
			?.getAttribute("content");
		authorId = document
			.querySelector("meta[name='authorid']")
			?.getAttribute("content");

		if (sampleId) {
			doCompile();
		}
	}

	// Try to restore existing session
	try {
		authData = await pocketbaseClient.collection("users").authRefresh();
		if (authData) {
			onLogin();
		}
	} catch {
		// No existing session
	}
});
