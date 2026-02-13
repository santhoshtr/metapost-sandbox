class Point {
	constructor(x, y) {
		this.x = Math.round(x);
		this.y = Math.round(y);
	}

	toString() {
		return `(${this.x},${this.y})`;
	}
}

class Curve {
	constructor(p1, c1, c2, p2) {
		this.p1 = p1;
		this.c1 = c1;
		this.c2 = c2;
		this.p2 = p2;
	}
	annotate(index) {
		annotateControlLine(annotationLayer, this.p1, this.c1);
		annotateControlLine(annotationLayer, this.c2, this.p2);
		annotatePoint(annotationLayer, this.p1, index + 0, false);
		annotatePoint(annotationLayer, this.c1, index + 0, true);
		annotatePoint(annotationLayer, this.c2, index + 1, true);
		annotatePoint(annotationLayer, this.p2, index + 1, false);
	}
}

function annotate(originalSVG) {
	const annotationLayer = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"svg",
	);
	annotationLayer.setAttribute("id", "annotationLayer");
	originalSVG.parentNode.appendChild(annotationLayer);
	annotationLayer.setAttribute("width", originalSVG.getAttribute("width"));
	annotationLayer.setAttribute("height", originalSVG.getAttribute("height"));
	annotationLayer.setAttribute("viewBox", originalSVG.getAttribute("viewBox"));

	const paths = originalSVG.getElementsByTagName("path");

	for (let path of paths) {
		const d = path.getAttribute("d");
		const commands = d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g);

		let pointIndex = 0;
		let lastPoint = null;
		commands.forEach((cmd) => {
			const type = cmd[0];
			const points = parsePoints(cmd.slice(1).trim());

			if (type === "M") {
				// annotatePoint(annotationLayer, points[0], pointIndex++);
			}
			if (type === "L") {
				annotatePoint(annotationLayer, points[0], pointIndex++);
			}
			if (type === "C") {
				const p1 = lastPoint;
				const c1 = points[0];
				const c2 = points[1];
				const p2 = points[2];
				const c = new Curve(p1, c1, c2, p2);
				c.annotate(pointIndex++);
			}
			lastPoint = points[points.length - 1];
		});
	}
}

function parsePoints(pointString) {
	const coordinates = pointString.split(/[\s,]+/).map(Number);
	const points = [];
	for (let i = 0; i < coordinates.length; i += 2) {
		points.push(new Point(coordinates[i], coordinates[i + 1]));
	}
	return points;
}

function annotatePoint(svg, point, index, isControlPoint = false) {
	const circle = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"circle",
	);
	circle.setAttribute("cx", point.x);
	circle.setAttribute("cy", point.y);
	circle.setAttribute("r", "3");

	circle.classList.add(isControlPoint ? "control-point" : "point");
	const titleElement = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"title",
	);
	titleElement.textContent = point.toString();
	circle.appendChild(titleElement);
	svg.appendChild(circle);
	if (!isControlPoint) {
		const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
		text.setAttribute("x", point.x + 5);
		text.setAttribute("y", point.y - 5);
		text.textContent = `${index}`;
		text.classList.add("coordinate-text");
		svg.appendChild(text);
	}
}

function annotateControlLine(svg, start, end) {
	const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
	line.setAttribute("x1", start.x);
	line.setAttribute("y1", start.y);
	line.setAttribute("x2", end.x);
	line.setAttribute("y2", end.y);
	line.classList.add("annotation");
	svg.appendChild(line);
}

export { annotate };

