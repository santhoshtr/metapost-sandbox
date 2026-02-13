/**
 * SVG Annotation Module
 * Adds interactive annotations to SVG paths showing control points and curves
 */

const POINT_RADIUS = 3;
const TEXT_OFFSET_X = 5;
const TEXT_OFFSET_Y = -5;
const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Represents a 2D point with integer coordinates
 */
class Point {
	/**
	 * @param {number} x - X coordinate
	 * @param {number} y - Y coordinate
	 */
	constructor(x, y) {
		this.x = Math.round(x);
		this.y = Math.round(y);
	}

	/**
	 * @returns {string} Formatted point string
	 */
	toString() {
		return `(${this.x},${this.y})`;
	}
}

/**
 * Represents a cubic Bezier curve with control points
 */
class Curve {
	/**
	 * @param {Point} p1 - Start point
	 * @param {Point} c1 - First control point
	 * @param {Point} c2 - Second control point
	 * @param {Point} p2 - End point
	 */
	constructor(p1, c1, c2, p2) {
		this.p1 = p1;
		this.c1 = c1;
		this.c2 = c2;
		this.p2 = p2;
	}

	/**
	 * Render annotations for this curve
	 * @param {SVGSVGElement} annotationLayer - SVG layer to append to
	 * @param {number} index - Point index for labeling
	 */
	annotate(annotationLayer, index) {
		annotateControlLine(annotationLayer, this.p1, this.c1);
		annotateControlLine(annotationLayer, this.c2, this.p2);
		annotatePoint(annotationLayer, this.p1, index, false);
		annotatePoint(annotationLayer, this.c1, index, true);
		annotatePoint(annotationLayer, this.c2, index + 1, true);
		annotatePoint(annotationLayer, this.p2, index + 1, false);
	}
}

/**
 * Parse SVG path data and add annotations
 * @param {SVGSVGElement} originalSVG - The SVG element to annotate
 */
function annotate(originalSVG) {
	const annotationLayer = document.createElementNS(SVG_NS, "svg");
	annotationLayer.setAttribute("id", "annotationLayer");
	annotationLayer.setAttribute("width", originalSVG.getAttribute("width"));
	annotationLayer.setAttribute("height", originalSVG.getAttribute("height"));
	annotationLayer.setAttribute("viewBox", originalSVG.getAttribute("viewBox"));

	originalSVG.parentNode?.appendChild(annotationLayer);

	const paths = originalSVG.getElementsByTagName("path");
	const pathCommandRegex = /[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g;

	for (const path of paths) {
		const d = path.getAttribute("d");
		if (!d) continue;

		const commands = d.match(pathCommandRegex);
		if (!commands) continue;

		let pointIndex = 0;
		let lastPoint = null;

		for (const cmd of commands) {
			const type = cmd[0];
			const pointString = cmd.slice(1).trim();
			const points = parsePoints(pointString);

			switch (type) {
				case "M":
					// Move command - don't annotate start point
					break;
				case "L":
					if (points[0]) {
						annotatePoint(annotationLayer, points[0], pointIndex++);
					}
					break;
				case "C":
					if (lastPoint && points.length >= 3) {
						const curve = new Curve(lastPoint, points[0], points[1], points[2]);
						curve.annotate(annotationLayer, pointIndex++);
					}
					break;
			}

			if (points.length > 0) {
				lastPoint = points[points.length - 1];
			}
		}
	}
}

/**
 * Parse coordinate string into Point objects
 * @param {string} pointString - Space/comma separated coordinates
 * @returns {Point[]} Array of parsed points
 */
function parsePoints(pointString) {
	if (!pointString) return [];

	const coordinates = pointString
		.split(/[\s,]+/)
		.map((coord) => Number.parseFloat(coord))
		.filter((num) => !Number.isNaN(num));

	const points = [];
	for (let i = 0; i < coordinates.length - 1; i += 2) {
		points.push(new Point(coordinates[i], coordinates[i + 1]));
	}
	return points;
}

/**
 * Create a point annotation (circle with optional index label)
 * @param {SVGSVGElement} svg - SVG container
 * @param {Point} point - Point to annotate
 * @param {number} index - Index for labeling (optional)
 * @param {boolean} isControlPoint - Whether this is a control point
 */
function annotatePoint(svg, point, index, isControlPoint = false) {
	const circle = document.createElementNS(SVG_NS, "circle");
	circle.setAttribute("cx", point.x);
	circle.setAttribute("cy", point.y);
	circle.setAttribute("r", POINT_RADIUS);
	circle.classList.add(isControlPoint ? "control-point" : "point");

	// Add tooltip with coordinates
	const title = document.createElementNS(SVG_NS, "title");
	title.textContent = point.toString();
	circle.appendChild(title);
	svg.appendChild(circle);

	// Add index label for non-control points
	if (!isControlPoint) {
		const text = document.createElementNS(SVG_NS, "text");
		text.setAttribute("x", point.x + TEXT_OFFSET_X);
		text.setAttribute("y", point.y + TEXT_OFFSET_Y);
		text.textContent = String(index);
		text.classList.add("coordinate-text");
		svg.appendChild(text);
	}
}

/**
 * Draw a line between two points
 * @param {SVGSVGElement} svg - SVG container
 * @param {Point} start - Start point
 * @param {Point} end - End point
 */
function annotateControlLine(svg, start, end) {
	const line = document.createElementNS(SVG_NS, "line");
	line.setAttribute("x1", start.x);
	line.setAttribute("y1", start.y);
	line.setAttribute("x2", end.x);
	line.setAttribute("y2", end.y);
	line.classList.add("annotation");
	svg.appendChild(line);
}

export { annotate };
