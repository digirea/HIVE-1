/*jslint devel: true */
/*global SVG */

function svgNodeUI(draw) {
	'use strict';
	
	// NodeUI global
	var holeSize = 20,
		holeSets = draw.set(),
		draggingPlug = null,
		nodeArray = {},
		plugArray = {};

	function getPlugVarName(nodeName, plugName) {
		return nodeName + ':' + plugName;
	}
	function getNodeNameFromVarname(varName) {
		var sp = varName.split(':');
		return sp[0];
	}
	function getPlugNameFromVarname(varName) {
		var sp = varName.split(':');
		if (sp.length > 1) {
			return sp[1];
		} else {
			return sp[0];
		}
	}

	/* NodeUI class */
	function PlugClass(sx, sy, ex, ey) {
		this.sx = sx;
		this.sy = sy;
		this.ex = ex;
		this.ey = ey;
		this.line = draw.path('').fill('none').stroke({ width: 4, color: '#ef8815' });
		this.drawCurve(this.line, sx, sy, ex, ey);
	}
	PlugClass.prototype = {
		drawCurve: function () {
			var midx = (this.sx + this.ex) * 0.5,
				pstr = 'M' + this.sx + ',' + this.sy;
			pstr += 'C' + midx + ',' + this.sy + ' ' + midx + ',' + this.ey + ' ';
			pstr += this.ex + ',' + this.ey;
			this.line.plot(pstr);
		},
		front: function () {
			this.line.front();
		},
		startPos: function (x, y) {
			this.sx = x;
			this.sy = y;
			this.drawCurve();
		},
		endPos: function (x, y) {
			this.ex = x;
			this.ey = y;
			this.drawCurve();
		},
		reset: function () {
			this.ex = this.sx;
			this.ey = this.sy;
			this.drawCurve();
		},
		erase: function () {
			this.line.remove();
		}
	};

	function NodeConnector(varname, vartype, svgparent, parentNode, x, y) {
		this.type = 'NodeConnector';
		this.varname = varname;
		this.vartype = vartype;
		this.svgparent = svgparent;
		this.parentNode = parentNode;
		this.px = x;
		this.py = y;
		this.connected = null;
		this.line = null;

		var hole = draw.circle(holeSize).center(svgparent.x() + x, svgparent.y() + y).fill('rgb(200, 200, 200)'),
			holeMouseUp = function (self) {
				return function () {
					if (draggingPlug !== null) {
						if (self.connected) {
							self.connected.disconnect();
							self.disconnect();
						}
						
						self.connectPlug(draggingPlug);
						draggingPlug = null;
					}
				};
			};
		hole.on('mouseup', holeMouseUp(this));
		this.hole = hole;
		holeSets.add(hole);
	}
	NodeConnector.prototype = {
		fit: function () {
			this.hole.center(this.px + this.svgparent.x(), this.py + this.svgparent.y());
			if (this.connected && this.line) {
				this.line.endPos(this.px + this.svgparent.x(), this.py + this.svgparent.y());
			}
		},
		front: function () {
			this.hole.front();
		},
		disconnect: function () {
			this.connected = null;
			this.line = null;
			delete plugArray[this.varname];
		},
		connectPlug: function (plug) {
			if (this.vartype !== plug.vartype) {
				console.log('Error invalid data type.', this.vartype, plug.vartype);
				return;
			}
			
			plugArray[this.varname] = plug;
			
			this.line = plug.line;
			this.connected = plug;
			plug.connected = this;
			this.fit();
			plug.fit();
		},
		erase: function () {
			this.disconnect();
			this.hole.remove();
		}
	};

	function NodePlug(varname, vartype, svgparent, parentNode, x, y) {
		this.type = 'NodePlug';
		this.varname = varname;
		this.vartype = vartype;
		this.svgparent = svgparent;
		this.parentNode = parentNode;
		this.px = x;
		this.py = y;
		this.connected = null;
		this.line = new PlugClass(svgparent.x() + x, svgparent.y() + y, svgparent.x() + x, svgparent.y() + y, 4);

		var hole = draw.circle(holeSize).center(svgparent.x() + x, svgparent.y() + y).fill('#c7c7c7'),
			pole = draw.circle(holeSize).center(svgparent.x() + x, svgparent.y() + y).fill('#ef8815'),
			poleDragstart = function (self) {
				return function (delta, event) {
					event.stopPropagation();
					this.line.front();
					this.front();
					holeSets.front();
					draggingPlug = self;
					if (self.connected) {
						self.connected.disconnect();
						self.disconnect();
					}
				};
			},
			poleDragend = function (self) {
				return function (delta, event) {
					event.stopPropagation();
					if (!self.connected) {
						draggingPlug = null;
						self.line.endPos(self.px + self.svgparent.x(), self.py + self.svgparent.y());
					}
					this.center(self.px + self.svgparent.x(), self.py + self.svgparent.y());
				};
			};
		this.pole = pole;
		this.hole = hole;
		pole.front();
		pole.line = this.line;
		pole.draggable();
		pole.dragstart = poleDragstart(this);
		pole.dragmove = function (delta, event) {
			event.stopPropagation();
			this.line.endPos(event.pageX, event.pageY);
		};
		pole.dragend = poleDragend(this);
	}
	NodePlug.prototype = {
		fit: function () {
			this.line.startPos(this.px + this.svgparent.x(), this.py + this.svgparent.y());
			this.hole.center(this.px + this.svgparent.x(), this.py + this.svgparent.y());
			this.pole.center(this.px + this.svgparent.x(), this.py + this.svgparent.y());
			if (!this.connected) {
				this.line.endPos(this.px + this.svgparent.x(), this.py + this.svgparent.y());
			}
		},
		front: function () {
			this.hole.front();
			this.pole.front();
		},
		disconnect: function () {
			if (plugArray[this]) {
				delete plugArray[this];
			}
			this.connected = null;
			this.line.reset();
		},
		erase: function () {
			this.disconnect();
			this.pole.remove();
			this.hole.remove();
			this.pole = null;
			this.hole = null;
			this.line.erase();
			delete this.line;
			this.line = null;
		}
	};

	function Node(typename, inouts) {
		var varName = inouts.varname,
			nodebase = draw.rect(220, 60).radius(10).attr({'fill': "#424542", 'fill-opacity': "0.8", 'stroke': "none"}),
			titletext = draw.text(typename).fill('#ef8815').move(15, 5),
			group = draw.group(),
			groupDragStart = function (self) {
				return function (delta, event) {
					event.stopPropagation();
					self.front();
				};
			},
			groupDragMove = function (self) {
				return function (delta, event) {
					event.stopPropagation();
					self.nodeData.pos[0] = self.orgPos[0] + delta.x;
					self.nodeData.pos[1] = self.orgPos[1] + delta.y;
					self.fit();
				};
			},
			i,
			nodeText,
			inoutNum = 0,
			nodeVarName,
			plugConnectors = {};
		
		nodeArray[varName] = this;

		group.add(nodebase);
		group.add(titletext);
		group.draggable();
		group.dragstart = groupDragStart(this);
		group.dragmove = groupDragMove(this);
		group.dragend = function (delta, event) {
			event.stopPropagation();
		};
		this.nodeData = inouts;
		this.orgPos = [0, 0];
		
		this.group = group;
		this.plugConnectors = plugConnectors;
		
		// Node Params
		if (inouts) {
			if (inouts.input) {
				inoutNum = Math.max(inoutNum, inouts.input.length);
				for (i = 0; i < inouts.input.length; i += 1) {
					nodeText = draw.text(inouts.input[i].name).fill('#fff').move(20, 30 + i * 20);
					group.add(nodeText);
					nodeVarName = getPlugVarName(varName, inouts.input[i].name);
					plugConnectors[inouts.input[i].name] = new NodeConnector(nodeVarName, inouts.input[i].type, group, this, 0, 40 + i * 20);
				}
			}
			if (inouts.output) {
				inoutNum = Math.max(inoutNum, inouts.output.length);
				for (i = 0; i < inouts.output.length; i += 1) {
					nodeText = draw.text(inouts.output[i].name).fill('#fff').move(130, 30 + i * 20);
					group.add(nodeText);
					nodeVarName = getPlugVarName(varName,  inouts.output[i].name);
					plugConnectors[inouts.output[i].name] = new NodePlug(nodeVarName, inouts.output[i].type, group, this, 220, 40 + i * 20);
				}
			}
		}
		nodebase.size(nodebase.width(), 40 + 20 * inoutNum);
		
		for (i in plugConnectors) {
			if (plugConnectors.hasOwnProperty(i)) {
				plugConnectors[i].fit();
			}
		}
	}
	Node.prototype = {
		front: function () {
			var i;
			this.group.front();
			for (i in this.plugConnectors) {
				if (this.plugConnectors.hasOwnProperty(i)) {
					this.plugConnectors[i].front();
				}
			}
		},
		fit: function () {
			var i;
			for (i in this.plugConnectors) {
				if (this.plugConnectors.hasOwnProperty(i)) {
					this.plugConnectors[i].fit();
				}
			}
		},
		move: function (x, y) {
			this.orgPos[0] = x;
			this.orgPos[1] = y;
			this.group.move(x, y);
			this.fit();
		},
		getConnector: function (name) {
			return this.plugConnectors[name];
		},
		erase: function () {
			var i;
			this.group.remove();
			for (i in this.plugConnectors) {
				if (this.plugConnectors.hasOwnProperty(i)) {
					this.plugConnectors[i].erase();
					delete this.plugConnectors[i];
				}
			}
		}
	};

	function getNode(name) {
		return nodeArray[name];
	}
	function getPlug(name) {
		return plugArray[name];
	}
	
	function dump() {
		var i;
		for (i in nodeArray) {
			if (nodeArray.hasOwnProperty(i)) {
				console.log(i, nodeArray[i]);
			}
		}

		for (i in plugArray) {
			if (plugArray.hasOwnProperty(i)) {
				console.log(i, plugArray[i]);
			}
		}
	}

	function pushNextNode(nextNode, dependency) {
		if (!nextNode) {
			return;
		}
		
		var i, nextPlug, outNode;
		// multiplex reference
		i = dependency.indexOf(nextNode);
		if (i >= 0) {
			dependency.splice(i, 1);
		}
		dependency.push(nextNode);
		
		for (i in nextNode.plugConnectors) {
			if (nextNode.plugConnectors.hasOwnProperty(i)) {
				nextPlug = nextNode.plugConnectors[i];
				if (nextPlug.type === 'NodeConnector') { // input
					outNode = plugArray[nextPlug.varname];
					if (outNode) {
						pushNextNode(outNode.parentNode, dependency);
					}
				}
			}
		}
	}

	function exportLua() {
		var i,
			j,
			node,
			dependency = [],
			plug,
			plugname,
			src = '';
		
		
		pushNextNode(nodeArray.root, dependency);
		console.log(dependency);
		
		console.log('Export:');
		for (i = dependency.length - 1; i >= 0; i -= 1) {
			node = dependency[i].nodeData;
			if (node.define) {
				src += node.define;
			}
			src += 'local ' + node.varname + ' = ' + node.name + '()\n';
			if (node.funcname) {
				src += node.varname + ':' + node.funcname + '(';
			} else {
				src += node.varname + '(';
			}
			if (node.input) {
				for (j = 0; j < node.input.length; j += 1) {
					plugname = getPlugVarName(node.varname, node.input[j].name);
					if (plugArray[plugname]) {
						src += plugArray[plugname].varname + '()';
					} else if (node.input[j].value) {
						src += node.input[j].value;
					} else {
						src += 'nil';
					}
					if (j !== node.input.length - 1) {
						src += ',';
					}
					
				}
			}
			src += ')\n';
		}
		console.log(src);
		return src;
	}
	
	function pushDependencyNode(node, dependency, plugArray) {
		if (!node) {
			return;
		}
		var i, nextPlug, outNode;
		// multiplex reference
		i = dependency.indexOf(node);
		if (i >= 0) {
			dependency.splice(i, 1);
		}
		dependency.push(node);
		
		for (i in node.input) {
			if (node.input.hasOwnProperty(i)) {
				nextPlug = node.input[i];
				outNode = plugArray[nextPlug.varname];
				if (outNode) {
					pushDependencyNode(outNode.parentNode, dependency, plugArray);
				}
			}
		}
	}

	function convertToLua(data) {
		var nodeData = data.nodeData,
			plugData = data.plugData,
			node,
			outputPlug,
			inputNode,
			i,
			nodeA,
			plugA;
		
		// TODO:
		
		// store nodeArray, plugArray
		
		// start from root node.
		//var rootNode = nodeArray["root"];
		//pushDependencyNode(rootNode, dependency, plugA);
		
		// export denpendencies
		
	}
	
	function makeNodes(data) {
		var nodeData = data.nodeData,
			plugData = data.plugData,
			node,
			outputPlug,
			inputNode,
			i;
		for (i = 0; i < nodeData.length; i += 1) {
			node = new Node(nodeData[i].name, nodeData[i]);
			node.move(nodeData[i].pos[0], nodeData[i].pos[1]);
		}
		for (i = 0; i < plugData.length; i += 1) {
			outputPlug = getNode(plugData[i].output.node).getConnector(plugData[i].output.plug);
			inputNode = getNode(plugData[i].input.node).getConnector(plugData[i].input.plug);
			if (outputPlug && inputNode) {
				inputNode.connectPlug(outputPlug);
			}
		}
	}
	function getNodeData() {
		//nodeArray
		var i, node, plug, nodeData = [], plugData = [];
		for (i in nodeArray) {
			if (nodeArray.hasOwnProperty(i)) {
				node = nodeArray[i];
				nodeData.push(node.nodeData);
			}
		}
		//plugArray
		for (i in plugArray) {
			if (plugArray.hasOwnProperty(i)) {
				// Ref==> {output: {node: 'inst1', plug: 'Position'}, input: {node: 'root', plug: 'vertexbuf'}},
				plug = plugArray[i];
				plugData.push({output: {node: getNodeNameFromVarname(plug.varname), plug: getPlugNameFromVarname(plug.varname)},
							   input:  {node: getNodeNameFromVarname(i),            plug: getPlugNameFromVarname(i)}});
			}
		}
		return {nodeData: nodeData, plugData: plugData};
	}
	function clearNodes() {
		var i;
		for (i in nodeArray) {
			if (nodeArray.hasOwnProperty(i)) {
				nodeArray[i].erase();
				delete nodeArray[i];
			}
		}
		for (i in plugArray) {
			if (plugArray.hasOwnProperty(i)) {
				delete plugArray[i];
			}
		}

		nodeArray = {};
		plugArray = {};
		holeSets.remove();
		holeSets = draw.set();
	}
	
	return {
		PlugClass: PlugClass,
		NodePlug: NodePlug,
		NodeConnector: NodeConnector,
		Node: Node,
		getNode: getNode,
		getPlug: getPlug,
		exportLua: exportLua,
		dump: dump,
		makeNodes: makeNodes,
		getNodeData: getNodeData,
		clearNodes: clearNodes
	};
}

