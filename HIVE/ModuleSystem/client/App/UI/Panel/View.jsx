import React from "react";
import ReactDOM from "react-dom";
import Container from "./Container.jsx";
import Core from '../../Core';

export default class View extends React.Component {
    constructor(props) {
        super(props);

        this.store = props.store;
        this.action = props.action;
        this.state = {
            nodes: [].concat(this.store.getNodes()),
			offset : [0, 0],
			zoom : 1.0
        };

        this.styles = this.styles.bind(this);
        this.generator = this.generator.bind(this);
        this.nodeCountChanged = this.nodeCountChanged.bind(this);
		this.isMiddleDown = false;
		this.isLeftDown = false;
		this.isRightDown = false;
		this.preZoom = 1.0;

        this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);
    }

    componentDidMount(){
        this.props.store.on(Core.Constants.NODE_COUNT_CHANGED, this.nodeCountChanged);
		window.addEventListener('mouseup', this.onMouseUp);
		window.addEventListener('mousemove', this.onMouseMove);
    }

    componentWillUnmount(){
        this.props.store.removeListener(Core.Constants.NODE_COUNT_CHANGED, this.nodeCountChanged);
		window.removeEventListener('mouseup', this.onMouseUp);
		window.removeEventListener('mousemove', this.onMouseMove);
    }

    nodeCountChanged(err, data){
        this.setState({nodes: [].concat(this.store.getNodes())});
    }

    onMouseDown(ev) {
    	this.props.action.unSelectNode([], this.props.nodeVarname);
		if (ev.button === 0) {
			this.isLeftDown = true;
		} else if (ev.button === 1) {
			this.isMiddleDown = true;
		} else if (ev.button === 2) {
			this.isRightDown = true;
		}
		this.pos = {
			x : ev.pageX,
			y : ev.pageY
		};
    }

	onMouseMove(ev) {
		const px = ev.pageX;
		const py = ev.pageY;
		if (this.isMiddleDown || (this.isLeftDown && this.isRightDown)) {
            const dx = (px - this.pos.x) / this.state.zoom;
            const dy = (py - this.pos.y) / this.state.zoom;
			this.setState({
				offset : [this.state.offset[0] + dx, this.state.offset[1] + dy]
			});
		} else if (this.isRightDown) {
            const dx = (px - this.pos.x);
            const dy = (py - this.pos.y);
            const mv = (dx + dy) * 0.005;
			let preZoom = this.state.zoom;
			let zoom = this.state.zoom;
            zoom = zoom + mv;
            if (zoom <= 0.1) {
                zoom = 0.1;
            } else if (zoom >= 1.0) {
                zoom = 1.0;
            }
			this.setState({
				zoom : zoom
			});
		}

		this.pos = {
			x : px,
			y : py
		};
	}

	onMouseUp(ev) {
		if (ev.button == 2 && this.isRightDown) {
			this.isRightDown = false;
		}
		if (ev.button == 1 && this.isMiddleDown) {
			this.isMiddleDown = false;
		}
		if (ev.button == 0 && this.isLeftDown) {
			this.isLeftDown = false;
		}
	}

	transform() {
		let scale = "scale(" + this.state.zoom + ")";
		let translate = "translate(" + String(this.state.offset[0]) + "px," + String(this.state.offset[1]) + "px)";
		return scale + " " + translate;
	}

	origin() {
		if (this.refs.viewport) {
			let rect = this.refs.viewport.getBoundingClientRect();
			let x = (rect.right - rect.left) / 2.0;
			let y = (rect.bottom - rect.top) / 2.0;
			return String(x) + "px " + String(y) + "px";
		} else {
			return "0px 0px";
		}
	}

    styles() {
        return {
            container: {
                margin : "0px",
                padding : "0px",
                width : "100%",
                height: "100%",
                position: "absolute"
            }
        };
    }

    generator(node, key) {
        return (
            <Container
                store={this.store}
                action={this.action}
                node={node}
                key={node.varname + key}
				zoom={1.0 / this.state.zoom}
				preZoom={1.0 / this.preZoom}
            />
        );
    }

    render() {
        var styles = this.styles();
        var a = (
            <div ref="viewport" style={styles.container} onMouseDown={this.onMouseDown}>
				<div style={{
						transform : this.transform.bind(this)(),
						transformOrigin : this.origin.bind(this)()}}
				>
	                {this.state.nodes.map((value, key)=>{
	                    return this.generator(value, key);
	                })}
				</div>
            </div>
        );
        return a;
    }
}
