/**
 * CodeMirror mode for Metapost syntax highlighting
 */

CodeMirror.defineMode("metapost", () => {
	const keywords =
		/^(?:and|controls|curl|enddef|endfor|endgroup|endif|endinput|endmacro|endtriple|for|else|elseif|exitif|image|input|let|macro|numeric|oct|of|pickup|path|pen|pensquare|rotated|save|string|stringify|suffix|text|tilde|transformed|truecorners|unfill|unitvector|verbatimtex|xpart|year|xyscaled|zpart)$/;

	const operators = /^(?:[+\-*/\\=<>!]+|:=|@=|\.\.|;|,|\(|\)|\[|\])/;
	const identifiers = /^[$_a-zA-Z]+[$_a-zA-Z0-9]*/;
	const number = /^[\d]+(?:\.[\d]*)?(?:e[+\-]?[\d]+)?/i;
	const strings = /^"(?:[^\\"]|\\(?:.|$))*"/;
	const comments = /^%.*?$/;

	/**
	 * Tokenize string content
	 * @param {Object} stream - CodeMirror stream
	 * @param {Object} state - Parser state
	 * @returns {string|null} Token type
	 */
	function tokenString(stream, state) {
		let escaped = false;
		while (!stream.eol()) {
			const ch = stream.next();
			if (ch === '"' && !escaped) {
				state.token = null;
				break;
			}
			escaped = !escaped && ch === "\\";
		}
		return "string";
	}

	return {
		startState() {
			return {
				token: null,
				string: null,
			};
		},

		token(stream, state) {
			if (stream.eatSpace()) {
				return null;
			}

			if (stream.match(comments)) {
				return "comment";
			}

			if (stream.match(strings)) {
				return "string";
			}

			if (stream.string === '"') {
				state.token = tokenString;
				return tokenString(stream, state);
			}

			if (stream.match(number)) {
				return "number";
			}

			if (stream.match(keywords)) {
				return "keyword";
			}

			if (stream.match(identifiers)) {
				return "variable";
			}

			if (stream.match(operators)) {
				return "operator";
			}

			stream.next();
			return null;
		},
	};
});

CodeMirror.defineMIME("text/x-metapost", "metapost");
