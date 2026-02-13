/**
 * Embed view initialization
 * Read-only CodeMirror editor for embedded metapost samples
 */

document.addEventListener("DOMContentLoaded", () => {
	const textarea = document.getElementById("metapost");

	if (window.CodeMirror && textarea) {
		CodeMirror.fromTextArea(textarea, {
			lineNumbers: true,
			mode: "metapost",
			theme: "nord",
			readOnly: true,
		});
	}
});
