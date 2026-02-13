/**
 * GitHub Gists API client
 * Handles CRUD operations for metapost code stored as gists
 */

const GITHUB_API_BASE = "https://api.github.com";
const METAPOST_TAG = "#metapost-sandbox";

/**
 * Create a new gist with metapost code
 * @param {string} title - The title/description
 * @param {string} code - The metapost code
 * @returns {Promise<Object>} Created gist data
 */
export async function createGist(title, code) {
	const response = await fetch(`${GITHUB_API_BASE}/gists`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // Send cookies
		body: JSON.stringify({
			description: `${title} ${METAPOST_TAG}`,
			public: true,
			files: {
				"main.mp": {
					content: code,
				},
			},
		}),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to create gist");
	}

	return formatGist(await response.json());
}

/**
 * Update an existing gist
 * @param {string} gistId - The gist ID
 * @param {string} title - The new title
 * @param {string} code - The new code
 * @returns {Promise<Object>} Updated gist data
 */
export async function updateGist(gistId, title, code) {
	const response = await fetch(`${GITHUB_API_BASE}/gists/${gistId}`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // Send cookies
		body: JSON.stringify({
			description: `${title} ${METAPOST_TAG}`,
			files: {
				"main.mp": {
					content: code,
				},
			},
		}),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to update gist");
	}

	return formatGist(await response.json());
}

/**
 * Get a single gist by ID
 * @param {string} gistId - The gist ID
 * @returns {Promise<Object|null>} Gist data or null if not found
 */
export async function getGist(gistId) {
	const response = await fetch(`${GITHUB_API_BASE}/gists/${gistId}`);

	if (response.status === 404) {
		return null;
	}

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to fetch gist");
	}

	return formatGist(await response.json());
}

/**
 * List gists for a specific user
 * Filters for metapost-sandbox tagged gists
 * @param {string} username - GitHub username
 * @returns {Promise<Array>} List of gist data
 */
export async function listUserGists(username) {
	const response = await fetch(
		`${GITHUB_API_BASE}/users/${username}/gists?per_page=100`
	);

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to fetch gists");
	}

	const gists = await response.json();

	// Filter for metapost-sandbox gists and format
	return gists
		.filter((gist) => gist.description && gist.description.includes(METAPOST_TAG))
		.map(formatGist);
}

/**
 * List authenticated user's gists
 * @returns {Promise<Array>} List of gist data
 */
export async function listMyGists() {
	const response = await fetch(`${GITHUB_API_BASE}/gists?per_page=100`, {
		credentials: "include", // Send cookies
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to fetch gists");
	}

	const gists = await response.json();

	// Filter for metapost-sandbox gists and format
	return gists
		.filter((gist) => gist.description && gist.description.includes(METAPOST_TAG))
		.map(formatGist);
}

/**
 * Format GitHub gist response to match our data model
 * @param {Object} gist - Raw gist data from GitHub API
 * @returns {Object} Formatted gist data
 */
function formatGist(gist) {
	const description = gist.description || "";
	// Remove the tag from title
	const title = description.replace(METAPOST_TAG, "").trim() || "Untitled";

	// Get the main.mp file content
	const mainFile = gist.files["main.mp"];
	const code = mainFile ? mainFile.content : "";

	return {
		id: gist.id,
		title: title,
		metapost: code,
		author: gist.owner.login,
		created: gist.created_at,
		updated: gist.updated_at,
		html_url: gist.html_url,
	};
}
