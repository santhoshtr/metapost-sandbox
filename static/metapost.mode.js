CodeMirror.defineMode("metapost", function () {
	var keywords =
		/^(?:and|controls|curl|enddef|endfor|endgroup|endif|endinput|endmacro|endtriple|for|else|elseif|exitif|image|input|let|macro|numeric|oct|of|pickup|path|pen|pensquare|rotated|save|string|stringify|suffix|text|tilde|transformed|truecorners|unfill|unitvector|verbatimtex|xpart|year|xyscaled|zpart)$/;

	var operators = /^(?:[+\-*\/\\=<>!]+|:=|@=|\.\.|:|;|,|\(|\)|\[|\])/;

	var identifiers = /^[$_a-zA-Z]+[$_a-zA-Z0-9]*/;

	var number = /^[\d]+(?:\.[\d]*)?(?:e[+\-]?[\d]+)?/i;

	var strings = /^"(?:[^\\"]|\\(?:.|$))*"/;

	var comments = /^%.*?$/;

	return {
		startState: function () {
			return {
				token: null,
				string: null,
			};
		},
		token: function (stream, state) {
			if (stream.eatSpace()) {
				return null;
			}

			if (stream.match(comments)) {
				return "comment";
			}
			if (stream.match(strings)) {
				return "string";
			}

			if (stream.string == '"') {
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
