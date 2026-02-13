/**
 * Main application module for Metapost Sandbox
 * Handles editor initialization, compilation, saving, and user authentication
 */

import {
	initiateLogin,
	logout,
	checkAuthCallback,
	isAuthenticated,
	getCurrentUser,
} from "./github-auth.js";
import {
	createGist,
	updateGist,
	getGist,
	listUserGists,
} from "./gist-client.js";
import { annotate } from "./svgannotate.js";

// DOM element references
let editor = null;
let authorId = null;
let sampleId = null;
let currentUser = null;
let compileAbortController = null;
let compileDebouncer = null;

const COMPILE_DELAY = 500;
const MIN_PANE_WIDTH = 200;

/**
 * Initialize resizable panes
 */
function initResizer() {
	const resizer = document.querySelector(".resizer");
	const container = document.querySelector(".container");
	const editorPane = document.querySelector(".editor-pane");
	const previewPane = document.querySelector(".preview-pane");

	if (!resizer || !container || !editorPane || !previewPane) return;

	// Restore saved layout
	const savedLayout = localStorage.getItem("editorLayout");
	if (savedLayout) {
		container.style.gridTemplateColumns = savedLayout;
	}

	let isResizing = false;
	let startX = 0;
	let startEditorWidth = 0;

	const startResize = (e) => {
		isResizing = true;
		startX = e.clientX;
		startEditorWidth = editorPane.getBoundingClientRect().width;

		container.style.cursor = "col-resize";
		document.body.style.userSelect = "none";

		e.preventDefault();
	};

	const resize = (e) => {
		if (!isResizing) return;

		const containerWidth = container.getBoundingClientRect().width;
		const resizerWidth = resizer.getBoundingClientRect().width;
		const deltaX = e.clientX - startX;
		const newEditorWidth = startEditorWidth + deltaX;
		const newPreviewWidth = containerWidth - newEditorWidth - resizerWidth;

		// Enforce minimum widths
		if (newEditorWidth < MIN_PANE_WIDTH || newPreviewWidth < MIN_PANE_WIDTH) {
			return;
		}

		const editorFlex = newEditorWidth / containerWidth;
		const previewFlex = newPreviewWidth / containerWidth;

		const newLayout = `${editorFlex}fr auto ${previewFlex}fr`;
		container.style.gridTemplateColumns = newLayout;
	};

	const stopResize = () => {
		if (!isResizing) return;
		isResizing = false;
		container.style.cursor = "";
		document.body.style.userSelect = "";

		// Save layout to localStorage
		const currentLayout = container.style.gridTemplateColumns;
		if (currentLayout) {
			localStorage.setItem("editorLayout", currentLayout);
		}
	};

	resizer.addEventListener("mousedown", startResize);
	document.addEventListener("mousemove", resize);
	document.addEventListener("mouseup", stopResize);
}

/**
 * Update UI after successful login
 */
function onLogin() {
	currentUser = getCurrentUser();
	if (!currentUser) return;

	const worksLink = document.getElementById("b-works");
	if (worksLink) {
		worksLink.href = `/u/${currentUser.username}`;
		worksLink.parentElement?.classList.remove("hidden");
	}

	const profileBtn = document.getElementById("b-profile");
	if (profileBtn) {
		const avatarImg = document.createElement("img");
		avatarImg.src = currentUser.avatar_url;
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
		initiateLogin();
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
 * Save current metapost code to GitHub Gist
 */
async function doSave() {
	// Trigger compile first to validate
	try {
		doCompile();
	} catch {
		// Continue even if compile fails
	}

	// Authenticate if needed
	if (!isAuthenticated()) {
		await doGithubLogin();
		return; // Will redirect to GitHub OAuth
	}

	showLog("Saving...");

	const titleElement = document.getElementById("title");
	const title = titleElement?.value?.trim() || "Untitled";

	try {
		const code = editor?.getValue() || "";

		if (sampleId && authorId && authorId === currentUser?.username) {
			// Update existing gist
			await updateGist(sampleId, title, code);
			showLog(`Updated: ${sampleId}`);
		} else {
			// Create new gist
			const gist = await createGist(title, code);
			sampleId = gist.id;
			authorId = currentUser?.username;
			updateUrl(sampleId, title);
			showLog(`Saved: ${sampleId}`);

			// Update meta tag
			let metaSampleId = document.querySelector("meta[name='sampleid']");
			if (!metaSampleId) {
				metaSampleId = document.createElement("meta");
				metaSampleId.setAttribute("name", "sampleid");
				document.head.appendChild(metaSampleId);
			}
			metaSampleId.setAttribute("content", sampleId);
		}
	} catch (error) {
		console.error("Save failed:", error);
		showLog(`Save failed: ${error.message}`);
	}
}

/**
 * Logout current user
 */
async function doLogout() {
	try {
		await logout();
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
	const preface = '<?xml version="1.0" standalone="no"?>';
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
	// Check if we're on the editor page (has the metapost textarea)
	const textarea = document.getElementById("metapost");
	const isEditorPage = !!textarea;

	// Only initialize editor-specific features on the editor page
	if (isEditorPage) {
		// Initialize resizable panes
		initResizer();

		// Cache editor-specific DOM elements
		const saveBtn = document.getElementById("b-save");
		const compileBtn = document.getElementById("b-compile");
		const exportBtn = document.getElementById("b-export");
		const titleElement = document.getElementById("title");

		// Attach editor-specific event listeners
		exportBtn?.addEventListener("click", exportSVG);
		compileBtn?.addEventListener("click", doCompile);
		saveBtn?.addEventListener("click", doSave);

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
		if (window.CodeMirror) {
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
	}

	// Check for OAuth callback (works on all pages)
	const userFromCallback = await checkAuthCallback();
	if (userFromCallback) {
		currentUser = userFromCallback;
		onLogin();
	} else if (isAuthenticated()) {
		// User already logged in
		currentUser = getCurrentUser();
		onLogin();
	}

	// Cache common DOM elements (available on all pages)
	const loginBtn = document.getElementById("b-login");
	const logoutBtn = document.getElementById("b-logout");

	// Attach common event listeners
	loginBtn?.addEventListener("click", doGithubLogin);
	logoutBtn?.addEventListener("click", doLogout);
});
