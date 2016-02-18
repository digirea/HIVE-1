import React from "react"
import ReactDOM from "react-dom"

export default class Node extends React.Component {
	constructor(props) {
		super(props);
		this.isLeftDown = false;
		this.mousePos = { x : 0, y : 0};
		this.state = {
			pos : this.props.node.pos
		};
		this.componentDidMount = this.componentDidMount.bind(this);
		this.componentWillUnmount = this.componentWillUnmount.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.styles = this.styles.bind(this);
		this.inoutStyle = this.inoutStyle.bind(this);
	}

	styles() {
		return {
			node : {
				position : "absolute",
				left : String(this.state.pos[0]),
				top : String(this.state.pos[1]),
				width : "200px",
				height : String((Math.max(this.props.node.input.length, this.props.node.output.length) + 1) * 18 + 10),
				backgroundColor : "rgb(66, 69, 66)",
				color : "white",
				padding : "5px"
			},
			title : {
				color : "rgb(239, 136, 21)",
				fontSize : "16px"
			},
			inhole : {
				position : "absolute",
				left : "0px",
				width : "15px",
				height : "15px",
				marginTop : "3px",
				borderRadius : "15px",
				backgroundColor : "red"
			},
			outhole : {
				position : "absolute",
				right : "0px",
				width : "15px",
				height : "15px",
				marginTop : "3px",
				borderRadius : "15px",
				backgroundColor : "red"
			},
			inholeText : {
				position : "absolute",
				top : "0px",
				left : "15px", // holeのサイズ
				marginLeft : "4px",
				color : "white",
				fontSize : "14px"
			},
			outholeText : {
				position : "absolute",
				top : "0px",
				right : "15px", // holeのサイズ
				marginRight : "4px",
				color : "white",
				fontSize : "14px"
			}
		}
	}

	inoutStyle(key) {
		return {
			input : {
				position : "absolute",
				left : String(-15 / 2),
				top : String(18 * (key + 1) + 10),
				width : "100px",
				height : "20px"
			},
			output : {
				position : "absolute",
				right : String(-15 / 2),
				top : String(18 * (key + 1) + 10),
				width : "100px",
				height : "20px"
			}
		}
	}

	componentDidMount() {
		window.addEventListener('mousemove', this.onMouseMove);
		window.addEventListener('mouseup', this.onMouseUp);
	}

	componentWillUnmount() {
		window.removeEventListener('mousemove', this.onMouseMove);
		window.removeEventListener('mouseup', this.onMouseUp);
	}

	onMouseDown(ev) {
		if (ev.button === 0) {
			this.isLeftDown = true;
			this.mousePos = { x : ev.clientX, y : ev.clientY };
			this.offsetLeft = ev.currentTarget.offsetLeft;
			this.offsetTop = ev.currentTarget.offsetTop;
		}
	}

	onMouseUp(ev) {
		this.isLeftDown = false;
	}

	onMouseMove(ev) {
		if (this.isLeftDown) {
			// マウスダウン位置からの差分移動量.
			let mv = { x : ev.clientX - this.mousePos.x, y : ev.clientY - this.mousePos.y };
			// マウスダウン時のoffsetLeft/offsetTopに足し込む.
			this.setState({ pos : [this.offsetLeft + mv.x, this.offsetTop + mv.y] })
		}
	}

	inputElem() {
		const styles = this.styles();
		let inputs = this.props.node.input.map( (inputData, key) => {
			return (<div style={this.inoutStyle(key).input} key={key}>
						<div style={styles.inhole} />
						<div style={styles.inholeText}>{inputData.name}</div>
					</div>)
		});
		return (<div>{inputs}</div>);
	}

	outputElem() {
		const styles = this.styles();
		let outputs = this.props.node.output.map( (outputData, key) => {
			return (<div style={this.inoutStyle(key).output} key={key}>
						<div style={styles.outhole} />
						<div style={styles.outholeText}>{outputData.name}</div>
					</div>)
		});
		return (<div>{outputs}</div>);
	}

	titleElem() {
		const styles = this.styles();
		return <div style={styles.title}>{this.props.node.name}</div>
	}

	render () {
		const styles = this.styles();
		return (<div style={styles.node}
					ref="node"
					onMouseDown={this.onMouseDown.bind(this)}
				>
					{this.titleElem.bind(this)()}
					{this.inputElem.bind(this)()}
					{this.outputElem.bind(this)()}
				</div>);
	}
}