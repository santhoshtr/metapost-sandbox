document.addEventListener("DOMContentLoaded", async (event) => {
	if (window.CodeMirror) {
		var editor = CodeMirror.fromTextArea(document.getElementById("metapost"), {
			lineNumbers: true,
			mode: "metapost",
			theme: "nord",
			readOnly: true,
		});
	}
});
